"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const os_1 = require("os");
const utils_1 = require("@medusajs/framework/utils");
/** Medusa 2.13+ removed isPaymentProviderError from framework utils; Razorpay plugin still expects it. */
const __isPaymentProviderError = typeof utils_1.isPaymentProviderError === "function"
    ? utils_1.isPaymentProviderError
    : (e) => e != null && typeof e === "object" && typeof e.error === "string";
const types_1 = require("../types");
const get_smallest_unit_1 = require("../utils/get-smallest-unit");
const update_razorpay_customer_metadata_1 = require("../workflows/update-razorpay-customer-metadata");
/**
 * The paymentIntent object corresponds to a razorpay order.
 *
 */
class RazorpayBase extends utils_1.AbstractPaymentProvider {
    constructor(container, options) {
        super(container, options);
        this.options_ = options;
        this.logger = container.logger;
        this.container_ = container;
        this.options_ = options;
        this.init();
    }
    static validateOptions(options) {
        if (!(0, utils_1.isDefined)(options.key_id)) {
            throw new Error("Required option `key_id` is missing in Razorpay plugin");
        }
        else if (!(0, utils_1.isDefined)(options.key_secret)) {
            throw new Error("Required option `key_secret` is missing in Razorpay plugin");
        }
    }
    init() {
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        this.razorpay_ =
            this.razorpay_ ||
                new razorpay_1.default({
                    key_id: this.options_.key_id ?? provider?.options.key_id,
                    key_secret: this.options_.key_secret ?? provider?.options.key_secret,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Razorpay-Account": this.options_.razorpay_account ??
                            provider?.options.razorpay_account ??
                            undefined
                    }
                });
    }
    getPaymentIntentOptions() {
        const options = {};
        if (this?.paymentIntentOptions?.capture_method) {
            options.capture_method = this.paymentIntentOptions.capture_method;
        }
        if (this?.paymentIntentOptions?.setup_future_usage) {
            options.setup_future_usage =
                this.paymentIntentOptions.setup_future_usage;
        }
        if (this?.paymentIntentOptions?.payment_method_types) {
            options.payment_method_types =
                this.paymentIntentOptions.payment_method_types;
        }
        return options;
    }
    _validateSignature(razorpay_payment_id, razorpay_order_id, razorpay_signature) {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        const expectedSignature = crypto_1.default
            .createHmac("sha256", this.options_.key_secret ??
            provider.options.key_secret)
            .update(body.toString())
            .digest("hex");
        return expectedSignature === razorpay_signature;
    }
    /**
     * Medusa v2 passes `{ data: session.data, context }` to provider hooks.
     * Unwrap to the Razorpay order / session payload stored in `data`.
     */
    _sessionPayload(input) {
        if (input == null || typeof input !== "object")
            return input;
        if (Object.prototype.hasOwnProperty.call(input, "data") &&
            input.data != null &&
            typeof input.data === "object" &&
            !Array.isArray(input.data)) {
            return input.data;
        }
        return input;
    }
    async getRazorpayPaymentStatus(paymentIntent, attempts) {
        if (!paymentIntent) {
            return utils_1.PaymentSessionStatus.ERROR;
        }
        else {
            const authorisedAttempts = attempts.items.filter((i) => i.status == utils_1.PaymentSessionStatus.AUTHORIZED);
            const totalAuthorised = authorisedAttempts.reduce((p, c) => {
                p += parseInt(`${c.amount}`);
                return p;
            }, 0);
            return totalAuthorised == paymentIntent.amount
                ? utils_1.PaymentSessionStatus.AUTHORIZED
                : utils_1.PaymentSessionStatus.REQUIRES_MORE;
        }
    }
    async getPaymentStatus(paymentSessionData) {
        // Session `data` must be a Razorpay *order* (order_*). If `id` is a payment id (pay_*)
        // or missing, use `order_id` / `razorpay_order_id` so orders.fetch never gets undefined
        // (Razorpay error: "`order_id` is mandatory").
        let id = paymentSessionData?.id;
        const orderId = paymentSessionData?.order_id ?? paymentSessionData?.razorpay_order_id;
        if (typeof id === "string" && id.startsWith("pay_")) {
            id = orderId;
        }
        if (!id && typeof orderId === "string") {
            id = orderId;
        }
        if (!id) {
            this.logger.warn("Razorpay getPaymentStatus: missing order id on payment session data");
            return utils_1.PaymentSessionStatus.ERROR;
        }
        let paymentIntent;
        let paymentsAttempted;
        try {
            paymentIntent = await this.razorpay_.orders.fetch(id);
            paymentsAttempted = await this.razorpay_.orders.fetchPayments(id);
        }
        catch (e) {
            this.logger.warn("received payment data from session not order data");
            const fallback = typeof orderId === "string" && orderId && orderId !== id ? orderId : null;
            if (!fallback) {
                this.logger.warn("Razorpay getPaymentStatus: no fallback order id after fetch failure");
                return utils_1.PaymentSessionStatus.ERROR;
            }
            paymentIntent = await this.razorpay_.orders.fetch(fallback);
            paymentsAttempted = await this.razorpay_.orders.fetchPayments(fallback);
        }
        switch (paymentIntent.status) {
            // created' | 'authorized' | 'captured' | 'refunded' | 'failed'
            case "created":
                return utils_1.PaymentSessionStatus.REQUIRES_MORE;
            case "paid":
                return utils_1.PaymentSessionStatus.AUTHORIZED;
            case "attempted":
                return await this.getRazorpayPaymentStatus(paymentIntent, paymentsAttempted);
            default:
                return utils_1.PaymentSessionStatus.PENDING;
        }
    }
    async updateRazorpayMetadataInCustomer(customer, parameterName, parameterValue) {
        const metadata = customer.metadata;
        let razorpay = metadata?.razorpay;
        if (razorpay) {
            razorpay[parameterName] = parameterValue;
        }
        else {
            razorpay = {};
            razorpay[parameterName] = parameterValue;
        }
        //
        const x = await (0, update_razorpay_customer_metadata_1.updateRazorpayCustomerMetadataWorkflow)(this.container_).run({
            input: {
                medusa_customer_id: customer.id,
                razorpay
            }
        });
        const result = x.result.customer;
        return result;
    }
    // @Todo refactor this function to 3 simple functions to make it more readable
    // 1. check existing customer
    // 2. create customer
    // 3. update customer
    async editExistingRpCustomer(customer, intentRequest, extra) {
        let razorpayCustomer;
        const razorpay_id = intentRequest.notes?.razorpay_id ||
            customer.metadata?.razorpay_id ||
            customer.metadata?.razorpay?.rp_customer_id;
        try {
            razorpayCustomer = await this.razorpay_.customers.fetch(razorpay_id);
        }
        catch (e) {
            this.logger.warn("unable to fetch customer in the razorpay payment processor");
        }
        // edit the customer once fetched
        if (razorpayCustomer) {
            const editEmail = customer.email;
            const editName = `${customer.first_name} ${customer.last_name}`.trim();
            const editPhone = customer?.phone ||
                customer?.addresses.find((v) => v.phone != undefined)?.phone;
            try {
                const updateRazorpayCustomer = await this.razorpay_.customers.edit(razorpayCustomer.id, {
                    email: editEmail ?? razorpayCustomer.email,
                    contact: editPhone ?? razorpayCustomer.contact,
                    name: editName != "" ? editName : razorpayCustomer.name
                });
                razorpayCustomer = updateRazorpayCustomer;
            }
            catch (e) {
                this.logger.warn("unable to edit customer in the razorpay payment processor");
            }
        }
        if (!razorpayCustomer) {
            try {
                razorpayCustomer = await this.createRazorpayCustomer(customer, intentRequest, extra);
            }
            catch (e) {
                this.logger.error("something is very wrong please check customer in the dashboard.");
            }
        }
        return razorpayCustomer; // returning un modified razorpay customer
    }
    async createRazorpayCustomer(customer, intentRequest, extra) {
        let razorpayCustomer;
        const phone = customer.phone ??
            extra.billing_address?.phone ??
            customer?.addresses.find((v) => v.phone != undefined)?.phone;
        const gstin = customer?.metadata?.gstin ?? undefined;
        if (!phone) {
            throw new Error("phone number to create razorpay customer");
        }
        if (!customer.email) {
            throw new Error("email to create razorpay customer");
        }
        const firstName = customer.first_name ?? "";
        const lastName = customer.last_name ?? "";
        try {
            const customerParams = {
                email: customer.email,
                contact: phone,
                gstin: gstin,
                fail_existing: 0,
                name: `${firstName} ${lastName} `,
                notes: {
                    updated_at: new Date().toISOString()
                }
            };
            razorpayCustomer = await this.razorpay_.customers.create(customerParams);
            intentRequest.notes.razorpay_id = razorpayCustomer?.id;
            if (customer && customer.id) {
                await this.updateRazorpayMetadataInCustomer(customer, "rp_customer_id", razorpayCustomer.id);
            }
            return razorpayCustomer;
        }
        catch (e) {
            this.logger.error("unable to create customer in the razorpay payment processor");
            return;
        }
    }
    async pollAndRetrieveCustomer(customer) {
        let customerList = [];
        let razorpayCustomer;
        const count = 10;
        let skip = 0;
        do {
            customerList = (await this.razorpay_.customers.all({
                count,
                skip
            }))?.items;
            razorpayCustomer =
                customerList?.find((c) => c.contact == customer?.phone ||
                    c.email == customer.email) ?? customerList?.[0];
            if (razorpayCustomer) {
                await this.updateRazorpayMetadataInCustomer(customer, "rp_customer_id", razorpayCustomer.id);
                break;
            }
            if (!customerList || !razorpayCustomer) {
                throw new Error("no customers and cant create customers in razorpay");
            }
            skip += count;
        } while (customerList?.length == 0);
        return razorpayCustomer;
    }
    async fetchOrPollForCustomer(customer) {
        let razorpayCustomer;
        try {
            const rp_customer_id = customer.metadata?.razorpay?.rp_customer_id;
            if (rp_customer_id) {
                razorpayCustomer = await this.razorpay_.customers.fetch(rp_customer_id);
            }
            else {
                razorpayCustomer = await this.pollAndRetrieveCustomer(customer);
                this.logger.debug(`updated customer ${razorpayCustomer.email} with RpId :${razorpayCustomer.id}`);
            }
            return razorpayCustomer;
        }
        catch (e) {
            this.logger.error("unable to poll customer in the razorpay payment processor");
            return;
        }
    }
    async createOrUpdateCustomer(intentRequest, customer, extra) {
        let razorpayCustomer;
        try {
            const razorpay_id = customer.metadata?.razorpay?.rp_customer_id ||
                intentRequest.notes.razorpay_id;
            try {
                if (razorpay_id) {
                    this.logger.info("the updating  existing customer  in razorpay");
                    razorpayCustomer = await this.editExistingRpCustomer(customer, intentRequest, extra);
                }
            }
            catch (e) {
                this.logger.info("the customer doesn't exist in razopay");
            }
            try {
                if (!razorpayCustomer) {
                    this.logger.info("the creating  customer  in razopay");
                    razorpayCustomer = await this.createRazorpayCustomer(customer, intentRequest, extra);
                }
            }
            catch (e) {
                // if customer already exists in razorpay but isn't associated with a customer in medsusa
            }
            if (!razorpayCustomer) {
                try {
                    this.logger.info("relinking  customer  in razorpay by polling");
                    razorpayCustomer = await this.fetchOrPollForCustomer(customer);
                }
                catch (e) {
                    this.logger.error("unable to poll customer customer in the razorpay payment processor");
                }
            }
            return razorpayCustomer;
        }
        catch (e) {
            this.logger.error("unable to retrieve customer from cart");
        }
        return razorpayCustomer;
    }
    async initiatePayment(input) {
        const intentRequestData = this.getPaymentIntentOptions();
        const { currency_code, amount } = input;
        const { extra } = input.context;
        const cart = extra;
        if (!cart) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "cart not ready", utils_1.MedusaError.Codes.CART_INCOMPATIBLE_STATE);
        }
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        const sessionNotes = extra?.notes ?? {};
        const currencyUpper = currency_code.toUpperCase();
        const amountSmallest = Math.round(parseInt(amount.toString(), 10));
        // Medusa stores INR in paise; Razorpay Orders API expects amount in paise (integer).
        // Upstream 2.1.11 used getAmountFromSmallestUnit (-> rupees) then * 100 * 100, which
        // inflated the value ~100x and caused orders.create to fail -> empty payment session data.
        let toPay = currencyUpper === "INR"
            ? amountSmallest
            : (0, get_smallest_unit_1.getAmountFromSmallestUnit)(amountSmallest, currencyUpper);
        const intentRequest = {
            amount: toPay,
            currency: currency_code.toUpperCase(),
            notes: {
                ...sessionNotes,
                resource_id: extra?.resource_id ?? "",
                session_id: input.data?.session_id ?? input.context?.session_id,
                cart_id: extra?.id
            },
            payment: {
                capture: this.options_.auto_capture ?? provider?.options.auto_capture
                    ? "automatic"
                    : "manual",
                capture_options: {
                    refund_speed: this.options_.refund_speed ??
                        provider?.options.refund_speed ??
                        "normal",
                    automatic_expiry_period: Math.max(this.options_.automatic_expiry_period ??
                        provider?.options.automatic_expiry_period ??
                        20, 12),
                    manual_expiry_period: Math.max(this.options_.manual_expiry_period ??
                        provider?.options.manual_expiry_period ??
                        10, 7200)
                }
            },
            ...intentRequestData
        };
        let session_data;
        const customerDetails = input.context.customer ?? extra.customer;
        try {
            const razorpayCustomer = await this.createOrUpdateCustomer(intentRequest, customerDetails, extra);
            try {
                if (razorpayCustomer) {
                    this.logger.debug(`the intent: ${JSON.stringify(intentRequest)}`);
                }
                else {
                    this.logger.error("unable to find razorpay customer");
                }
                const phoneNumber = customerDetails.phone ?? cart.billing_address?.phone;
                if (!phoneNumber) {
                    const e = new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "no phone number", utils_1.MedusaError.Codes.CART_INCOMPATIBLE_STATE);
                    return this.buildError("An error occurred in InitiatePayment during the " +
                        "invalid phone number: " +
                        JSON.stringify(e), e);
                }
                session_data = await this.razorpay_.orders.create({
                    ...intentRequest
                });
            }
            catch (e) {
                const rp = e?.error ?? e;
                const desc = typeof rp?.description === "string"
                    ? rp.description
                    : (typeof e?.message === "string" ? e.message : JSON.stringify(rp ?? e));
                this.logger.error(`[Razorpay] orders.create failed: ${desc}`);
                return this.buildError("An error occurred in InitiatePayment during the " +
                    "creation of the razorpay payment intent: " +
                    JSON.stringify(e), e);
            }
        }
        catch (e) {
            return this.buildError("An error occurred in creating customer request:" + e.message, e);
        }
        return {
            data: { ...session_data, intentRequest: intentRequest }
        };
    }
    async authorizePayment(input, context) {
        const sessionData = this._sessionPayload(input);
        const status = await this.getPaymentStatus(sessionData);
        return {
            data: {
                ...sessionData,
            },
            status
        };
    }
    async cancelPayment(input) {
        const error = {
            error: "Unable to cancel as razorpay doesn't support cancellation",
            code: types_1.ErrorCodes.UNSUPPORTED_OPERATION
        };
        return error;
    }
    async capturePayment(input) {
        const paymentSessionData = this._sessionPayload(input);
        const order_id = paymentSessionData
            .id;
        const paymentsResponse = await this.razorpay_.orders.fetchPayments(order_id);
        const possibleCaptures = paymentsResponse.items?.filter((item) => item.status == "authorized");
        const result = possibleCaptures?.map(async (payment) => {
            const { id, amount, currency } = payment;
            const toPay = (0, get_smallest_unit_1.getAmountFromSmallestUnit)(Math.round(parseInt(amount.toString())), currency.toUpperCase()) * 100;
            const paymentIntent = await this.razorpay_.payments.capture(id, toPay, currency);
            return paymentIntent;
        });
        if (result) {
            const payments = await Promise.all(result);
            const res = payments.reduce((acc, curr) => ((acc[curr.id] = curr), acc), {});
            paymentSessionData.payments =
                res;
        }
        return paymentSessionData;
    }
    async deletePayment(paymentSessionData) {
        return await this.cancelPayment(paymentSessionData);
    }
    async refundPayment(input) {
        const paymentSessionData = this._sessionPayload(input);
        const refundAmount = input?.amount;
        const id = paymentSessionData
            .id;
        const paymentList = await this.razorpay_.orders.fetchPayments(id);
        const refundMinor = parseInt(`${refundAmount?.value ?? refundAmount ?? 0}`, 10);
        const payment_id = paymentList.items?.find((p) => {
            return (parseInt(`${p.amount}`) >= refundMinor * 100 &&
                (p.status == "authorized" || p.status == "captured"));
        })?.id;
        if (payment_id) {
            const refundRequest = {
                amount: refundMinor * 100
            };
            try {
                const refundSession = await this.razorpay_.payments.refund(payment_id, refundRequest);
                const refundsIssued = paymentSessionData.refundSessions;
                if (refundsIssued?.length > 0) {
                    refundsIssued.push(refundSession);
                }
                else {
                    paymentSessionData.refundSessions = [refundSession];
                }
            }
            catch (e) {
                return this.buildError("An error occurred in refundPayment", e);
            }
        }
        return paymentSessionData;
    }
    async retrievePayment(input) {
        const paymentSessionData = this._sessionPayload(input);
        let intent;
        try {
            const id = paymentSessionData
                .id;
            intent = await this.razorpay_.orders.fetch(id);
        }
        catch (e) {
            const id = paymentSessionData.order_id;
            try {
                intent = await this.razorpay_.orders.fetch(id);
            }
            catch (e) {
                this.buildError("An error occurred in retrievePayment", e);
            }
        }
        return intent;
    }
    async updatePayment(input) {
        const { amount, currency_code, context } = input;
        const { customer, billing_address, extra } = context;
        if (!billing_address && customer?.addresses?.length == 0) {
            return this.buildError("An error occurred in updatePayment during the retrieve of the cart", new Error("An error occurred in updatePayment during the retrieve of the cart"));
        }
        let refreshedCustomer;
        let customerPhone = "";
        let razorpayId;
        if (customer) {
            try {
                refreshedCustomer = input.context.customer;
                razorpayId = refreshedCustomer?.metadata?.razorpay
                    ?.rp_customer_id;
                customerPhone =
                    refreshedCustomer?.phone ?? billing_address?.phone ?? "";
                if (!refreshedCustomer.addresses.find((v) => v.id == billing_address?.id)) {
                    this.logger.warn("no customer billing found");
                }
            }
            catch {
                return this.buildError("An error occurred in updatePayment during the retrieve of the customer", new Error("An error occurred in updatePayment during the retrieve of the customer"));
            }
        }
        const isNonEmptyPhone = customerPhone || billing_address?.phone || customer?.phone || "";
        if (!razorpayId) {
            return this.buildError("razorpay id not supported", new Error("the phone number wasn't specified"));
        }
        if (razorpayId !== extra?.customer?.id) {
            const phone = isNonEmptyPhone;
            if (!phone) {
                this.logger.warn("phone number wasn't specified");
                return this.buildError("An error occurred in updatePayment during the retrieve of the customer", new Error("the phone number wasn't specified"));
            }
            const result = await this.initiatePayment(input);
            if (__isPaymentProviderError(result)) {
                return this.buildError("An error occurred in updatePayment during the initiate of the new payment for the new customer", result);
            }
            return result;
        }
        else {
            if (!amount) {
                return this.buildError("amount  not valid", new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_DATA, "amount  not valid", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE));
            }
            if (!currency_code) {
                return this.buildError("currency code not known", new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_DATA, "currency code unknown", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE));
            }
            try {
                const id = extra?.id;
                let sessionOrderData = {
                    currency: "INR"
                };
                if (id) {
                    sessionOrderData = (await this.razorpay_.orders.fetch(id));
                    delete sessionOrderData.id;
                    delete sessionOrderData.created_at;
                }
                input.currency_code =
                    currency_code?.toUpperCase() ??
                        sessionOrderData?.currency ??
                        "INR";
                const newPaymentSessionOrder = (await this.initiatePayment(input));
                return { data: { ...newPaymentSessionOrder.data } };
            }
            catch (e) {
                return this.buildError("An error occurred in updatePayment", e);
            }
        }
    }
    async updatePaymentData(sessionId, data) {
        try {
            // Prevent from updating the amount from here as it should go through
            // the updatePayment method to perform the correct logic
            if (data.amount || data.currency) {
                throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "Cannot update amount, use updatePayment instead");
            }
            try {
                const paymentSession = await this.razorpay_.payments.fetch(data.data.id);
                if (data.notes || data.data?.notes) {
                    const notes = data.notes || data.data?.notes;
                    const result = (await this.razorpay_.orders.edit(sessionId, {
                        notes: { ...paymentSession.notes, ...notes }
                    }));
                    return result;
                }
                else {
                    this.logger.warn("only notes can be updated in razorpay order");
                    return paymentSession;
                }
            }
            catch (e) {
                return data.data ?? data;
            }
        }
        catch (e) {
            return this.buildError("An error occurred in updatePaymentData", e);
        }
    }
    /*
  /**
   * Constructs Razorpay Webhook event
   * @param {object} data - the data of the webhook request: req.body
   * @param {object} signature - the Razorpay signature on the event, that
   *    ensures integrity of the webhook event
   * @return {object} Razorpay Webhook event
   */
    constructWebhookEvent(data, signature) {
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        return razorpay_1.default.validateWebhookSignature(data, signature, this.options_.webhook_secret ?? provider?.options.webhook_secret);
    }
    buildError(message, e) {
        return {
            error: message,
            code: "code" in e ? e.code : "",
            detail: __isPaymentProviderError(e)
                ? `${e.error}${os_1.EOL}${e.detail ?? ""}`
                : "detail" in e
                    ? e.detail
                    : e.message ?? ""
        };
    }
    async getWebhookActionAndData(webhookData) {
        const webhookSignature = webhookData.headers["x-razorpay-signature"];
        const webhookSecret = this.options_?.webhook_secret ||
            process.env.RAZORPAY_WEBHOOK_SECRET ||
            process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
        const logger = this.logger;
        const data = webhookData.data;
        logger.info(`Received Razorpay webhook body as object : ${JSON.stringify(webhookData.data)}`);
        try {
            const validationResponse = razorpay_1.default.validateWebhookSignature(webhookData.rawData.toString(), webhookSignature, webhookSecret);
            // return if validation fails
            if (!validationResponse) {
                return { action: utils_1.PaymentActions.FAILED };
            }
        }
        catch (error) {
            logger.error(`Razorpay webhook validation failed : ${error}`);
            return { action: utils_1.PaymentActions.FAILED };
        }
        const paymentData = webhookData.data
            .payload?.payment?.entity;
        const event = data.event;
        const order = await this.razorpay_.orders.fetch(paymentData.order_id);
        /** sometimes this even fires before the order is updated in the remote system */
        const outstanding = (0, get_smallest_unit_1.getAmountFromSmallestUnit)(order.amount_paid == 0 ? paymentData.amount : order.amount_paid, paymentData.currency.toUpperCase());
        switch (event) {
            // payment authorization is handled in checkout flow. webhook not needed
            case "payment.captured":
                return {
                    action: utils_1.PaymentActions.SUCCESSFUL,
                    data: {
                        session_id: paymentData.notes
                            .session_id,
                        amount: outstanding
                    }
                };
            case "payment.authorized":
                return {
                    action: utils_1.PaymentActions.AUTHORIZED,
                    data: {
                        session_id: paymentData.notes
                            .session_id,
                        amount: outstanding
                    }
                };
            case "payment.failed":
                // TODO: notify customer of failed payment
                return {
                    action: utils_1.PaymentActions.FAILED,
                    data: {
                        session_id: paymentData.notes
                            .session_id,
                        amount: outstanding
                    }
                };
                break;
            default:
                return { action: utils_1.PaymentActions.NOT_SUPPORTED };
        }
    }
}
RazorpayBase.identifier = "razorpay";
exports.default = RazorpayBase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF6b3JwYXktYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL3Jhem9ycGF5LWJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFPQSx3REFBZ0M7QUFDaEMsb0RBQTRCO0FBQzVCLDJCQUF5QjtBQWF6QixxREFTbUM7QUFDbkMsb0NBQTREO0FBQzVELGtFQUF1RTtBQUt2RSxzR0FBd0c7QUFFeEc7OztHQUdHO0FBRUgsTUFBZSxZQUFhLFNBQVEsK0JBQXVCO0lBUXZELFlBQXNCLFNBQWMsRUFBRSxPQUFPO1FBQ3pDLEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFMUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBZ0IsQ0FBQztRQUV6QyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM1QixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUV4QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBd0I7UUFDM0MsSUFBSSxDQUFDLElBQUEsaUJBQVMsRUFBQyxPQUFPLENBQUMsTUFBTSxDQUFFLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUksS0FBSyxDQUNYLHdEQUF3RCxDQUMzRCxDQUFDO1FBQ04sQ0FBQzthQUFNLElBQUksQ0FBQyxJQUFBLGlCQUFTLEVBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FDWCw0REFBNEQsQ0FDL0QsQ0FBQztRQUNOLENBQUM7SUFDTCxDQUFDO0lBRVMsSUFBSTtRQUNWLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FDMUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FB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