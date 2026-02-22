import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, Users, ShoppingBag, TrendingUp, 
  ArrowUpRight, Clock, CheckCircle, XCircle 
} from 'lucide-react';
import { formatPrice } from '@/lib/products';

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: any;
}

const Admin = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setOrders(data);
      
      // Calculate stats
      const totalRevenue = data.reduce((sum, order) => sum + order.total_amount, 0);
      const pendingOrders = data.filter(o => o.status === 'pending').length;
      const completedOrders = data.filter(o => o.status === 'completed').length;
      
      setStats({
        totalOrders: data.length,
        totalRevenue,
        pendingOrders,
        completedOrders,
      });
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <section className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Header */}
            <div className="mb-12">
              <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-4">
                <span className="w-8 h-px bg-primary" />
                Admin Dashboard
              </span>
              <h1 className="text-display-md font-display font-light">
                Business <span className="italic text-gold-gradient">Overview</span>
              </h1>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-primary' },
                { label: 'Revenue', value: formatPrice(stats.totalRevenue), icon: TrendingUp, color: 'text-green-500' },
                { label: 'Pending', value: stats.pendingOrders, icon: Clock, color: 'text-yellow-500' },
                { label: 'Completed', value: stats.completedOrders, icon: CheckCircle, color: 'text-green-500' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 rounded-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-display font-light mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="glass-card p-8 rounded-sm">
              <h2 className="text-xl font-display font-light mb-6">Recent Orders</h2>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Order ID</th>
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</th>
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Items</th>
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Total</th>
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4 text-sm font-mono">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="py-4 px-4 text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {Array.isArray(order.items) ? order.items.length : 0} items
                          </td>
                          <td className="py-4 px-4 text-sm font-medium text-gold-gradient">
                            {formatPrice(order.total_amount)}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              order.status === 'completed' 
                                ? 'bg-green-500/10 text-green-500'
                                : order.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {order.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                              {order.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                              {order.status === 'pending' && <Clock className="w-3 h-3" />}
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                className="text-xs text-green-500 hover:underline"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;
