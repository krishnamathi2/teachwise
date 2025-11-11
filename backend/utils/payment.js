const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class PaymentManager {
  constructor(stripe, razorpay) {
    this.razorpay = razorpay;
  }

  /**
   * Create Razorpay order for credit purchase
   */
  async createRazorpayOrder(userId, packageId) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not configured');
      }

      // Get package details
      const { data: pkg, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (error || !pkg) {
        throw new Error('Package not found');
      }

      // Get user details
      const { data: user } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      const order = await this.razorpay.orders.create({
        amount: Math.round(pkg.price_inr * 100), // Convert to paise
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        notes: {
          userId: userId,
          packageId: packageId,
          credits: pkg.credits,
          userEmail: user?.email,
        },
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        package: {
          name: pkg.name,
          credits: pkg.credits,
          price: pkg.price_inr,
        },
        user: {
          email: user?.email,
          name: user?.full_name,
        },
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyRazorpaySignature(orderId, paymentId, signature) {
    try {
      const crypto = require('crypto');
      const text = orderId + '|' + paymentId;
      const generated = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      return generated === signature;
    } catch (error) {
      console.error('Error verifying Razorpay signature:', error);
      return false;
    }
  }

  /**
   * Process successful payment and add credits
   */
  async processPaymentSuccess(userId, packageId, paymentDetails) {
    try {
      // Get package details
      const { data: pkg, error: packageError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError || !pkg) {
        throw new Error('Package not found');
      }

      // Add credits using the add_credits function
      const { data, error } = await supabase.rpc('add_credits', {
        user_uuid: userId,
        credit_amount: pkg.credits,
        transaction_type: 'purchase',
        description: `Purchased ${pkg.name} - ${pkg.credits} credits`,
        metadata_json: paymentDetails,
      });

      if (error) {
        throw error;
      }

      // Get updated user credits
      const { data: user } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      return {
        success: true,
        creditsAdded: pkg.credits,
        totalCredits: user?.credits || 0,
      };
    } catch (error) {
      console.error('Error processing payment success:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

}

module.exports = PaymentManager;
