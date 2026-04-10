# Campaigns in Medusa Admin — complete practical guide

This guide explains the **Campaigns** screen in Medusa Admin in simple language, and how Campaigns relate to **Promotions** (coupon/discount rules).

If you saw an empty Campaigns page with a **Create** button, that is normal. Campaigns are containers you create first, then attach promotions to.

---

## 1) What a Campaign is

A **Campaign** is a planning container for marketing periods, such as:

- `Diwali Sale 2026`
- `Bridal Week`
- `Weekend Flash Sale`
- `New Launch Intro Offer`

Think of Campaign as the umbrella, and Promotions as the discount rules under it.

**Campaign does not discount by itself.**  
Discount behavior still comes from one or more **Promotions** linked to that campaign.

---

## 2) Campaign vs Promotion (most important)


| Item          | Purpose                 | Affects checkout totals? | Typical usage                                   |
| ------------- | ----------------------- | ------------------------ | ----------------------------------------------- |
| **Campaign**  | Organizes a sale period | No, by itself            | Planning, grouping, reporting, start/end window |
| **Promotion** | Actual discount logic   | Yes                      | Coupon code, automatic discount, buy X get Y    |


In short:

1. Create Campaign (optional but recommended for organization).
2. Create Promotion(s).
3. Link Promotion(s) to Campaign.
4. Activate promotions and test on storefront.

---

## 3) Fields in Create Campaign screen

On `Admin -> Campaigns -> Create`, you typically see:

- **Name**  
Human-friendly name. Example: `Diwali Gold Fest`.
- **Identifier**  
Internal slug/key. Keep it stable and machine-friendly. Example: `diwali-gold-fest-2026`.
- **Description**  
Optional notes for staff.
- **Start date / End date**  
Optional campaign timeline. Useful for scheduling and team clarity.
- **Campaign Budget Type**  
  - **Usage**: limit number of uses.
  - **Spend**: limit total discounted amount.
- **Limit** and **Limit usage per**  
Budget guardrails for campaign-level control.

### Important note

Even if campaign dates are set, your promotion must also be configured correctly (active status, rules, code/automatic behavior). Campaign and promotion settings should not conflict.

---

## 4) How Campaign connects to Promotions

Typical flow in Admin:

1. Create campaign.
2. Create promotion code (or automatic promotion).
3. In promotion details, set/link **campaign** (UI wording can vary by Medusa version).
4. Save promotion as Active.

Then checkout behavior works from promotion logic:

- percentage/fixed amount
- item/order/shipping target
- code or automatic
- currency/rules

Campaign mostly helps with management and grouping.

---

## 5) Recommended setup pattern (safe and clean)

Use this pattern for every sale:

1. **Create campaign first**
  - Name, identifier, date window.
2. **Create one or more promotions**
  - Example:
    - `DIWALI10` (10% order)
    - `DIWALI500` (fixed INR off)
    - automatic free shipping over threshold
3. **Link all promotions to the campaign**
4. **Test each promotion in storefront**
5. **Monitor usage/spend**
6. End campaign and deactivate old promotions when done

---

## 6) Example: complete end-to-end

Goal: Weekend sale with two offers.

- Campaign:
  - Name: `Weekend Sparkle Sale`
  - Identifier: `weekend-sparkle-2026-04`
  - Start: Friday 00:00
  - End: Sunday 23:59
- Promotions linked to campaign:
  - `WEEKEND10`: 10% off order
  - `WEEKENDFS`: automatic discounted shipping (rules apply)

Result:

- Campaign organizes the event.
- Promotions execute discount behavior at checkout.

---

## 7) When to use Campaigns vs skip Campaigns

Use Campaigns when:

- you run multiple promotions for one event
- you need clear start/end operational window
- you want better admin organization and reporting

You can skip Campaigns when:

- one small standalone coupon only
- temporary internal test promotion

Even then, Campaign is still recommended for clean ops at scale.

---

## 8) Troubleshooting

### Campaign created, but no discount in checkout

Check:

1. Promotion is Active
2. Promotion rules match cart (currency, items, totals)
3. Correct code entered (if code-based)
4. Promotion is linked correctly to intended campaign (optional for discount itself, but important for management)

### Campaign visible, promotions missing

Likely promotions were not linked to campaign, or query/filter in admin is narrowing list.

### Budget reached early

Check campaign budget type (usage/spend), limit value, and promotion redemption speed.

---

## 9) Operational best practices

- Use consistent identifiers: `event-season-year`
- Keep campaign descriptions useful for non-technical staff
- Always test promotion in a real storefront cart before announcing
- Prefer shorter valid periods for flash offers
- Deactivate expired promotions to avoid confusion

---

## 10) For Amby Luxe team (recommended naming)

- Campaign name format: `Event | Month Year`
  - Example: `Akshaya Tritiya | May 2026`
- Identifier format: `event-month-year`
  - Example: `akshaya-tritiya-may-2026`
- Promotion code format:
  - `AKSHAYA10`, `AKSHAYA500`, `AKSHAYAFS`

This keeps admin clean and easy for all staff.

---

## 11) Related docs in this repo

- `backend/docs/PROMOTIONS-ADMIN-GUIDE.md` — discount logic explained simply
- `backend/README.md` — backend setup and run instructions

---

If needed, next step can be a second document with your exact SOP:

- who creates campaign
- who approves
- who publishes codes
- who verifies checkout
- who closes campaign after end date

