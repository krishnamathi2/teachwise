// Credits management utilities for TeachWise backend

// Credit costs for different operations (Optimized for profitability)
const CREDIT_COSTS = {
  lesson_plan: 2,        // Reduced from 3 to 2 (better value)
  quiz: 1,               // Reduced from 2 to 1 (more accessible)
  presentation: 3,       // Reduced from 4 to 3 (competitive)
  quick_question: 1,     // Kept at 1 (already affordable)
  custom_content: 2      // Added new content type
};

// User tiers and their benefits (Updated for India market)
const USER_TIERS = {
  free: {
    name: 'Free',
    monthlyCredits: 10,
    maxCredits: 50,
    features: ['Basic AI tools', 'Community support', '10 free credits']
  },
  basic: {
    name: 'Basic',
    monthlyCredits: 100,
    maxCredits: 200,
    features: ['100 credits/month', 'All AI tools', 'Email support', 'Priority processing']
  },
  pro: {
    name: 'Pro', 
    monthlyCredits: 500,
    maxCredits: 1000,
    features: ['500 credits/month', 'All AI tools', 'Priority support', 'Custom templates', 'Advanced analytics']
  },
  enterprise: {
    name: 'Enterprise',
    monthlyCredits: 999999,
    maxCredits: 999999,
    features: ['Unlimited credits', 'All AI tools', 'Priority support', 'Custom templates', 'API access', 'Team management']
  }
};

// Supabase client for database operations
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class CreditsManager {
  /**
   * Get user's current credits and subscription info
   */
  static async getUserCredits(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('credits, subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        credits: user.credits || 0,
        tier: user.subscription_tier || 'free',
        status: user.subscription_status || 'active',
        tierInfo: USER_TIERS[user.subscription_tier || 'free']
      };
    } catch (error) {
      console.error('Error getting user credits:', error);
      return { credits: 0, tier: 'free', status: 'active', tierInfo: USER_TIERS.free };
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  static async hasEnoughCredits(userId, operationType) {
    const userCredits = await this.getUserCredits(userId);
    const requiredCredits = CREDIT_COSTS[operationType] || 1;
    
    return {
      hasEnough: userCredits.credits >= requiredCredits,
      currentCredits: userCredits.credits,
      requiredCredits: requiredCredits,
      remainingAfter: userCredits.credits - requiredCredits
    };
  }

  /**
   * Deduct credits for an operation
   */
  static async deductCredits(userId, operationType, description = null) {
    const requiredCredits = CREDIT_COSTS[operationType] || 1;
    
    try {
      // Use the database function to deduct credits atomically
      const { data, error } = await supabase.rpc('deduct_credits', {
        user_uuid: userId,
        credit_amount: requiredCredits,
        operation_type: operationType,
        operation_description: description || `${operationType} generation`
      });

      if (error) throw error;

      return {
        success: data,
        creditsDeducted: requiredCredits,
        operationType: operationType
      };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add credits to user account
   */
  static async addCredits(userId, amount, transactionType = 'purchase', description = null, metadata = null) {
    try {
      const { data, error } = await supabase.rpc('add_credits', {
        user_uuid: userId,
        credit_amount: amount,
        transaction_type: transactionType,
        description: description,
        metadata_json: metadata
      });

      if (error) throw error;

      return {
        success: data,
        creditsAdded: amount,
        transactionType: transactionType
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get credit transaction history
   */
  static async getCreditHistory(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(transaction => ({
        id: transaction.id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        operationType: transaction.operation_type,
        description: transaction.description,
        createdAt: transaction.created_at,
        metadata: transaction.metadata
      }));
    } catch (error) {
      console.error('Error getting credit history:', error);
      return [];
    }
  }

  /**
   * Get available credit packages
   */
  static async getCreditPackages() {
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('credits', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting credit packages:', error);
      return [];
    }
  }

  /**
   * Get subscription plans
   */
  static async getSubscriptionPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_usd', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      return [];
    }
  }

  /**
   * Reset monthly credits for subscription users
   */
  static async resetMonthlyCredits(userId) {
    try {
      const userCredits = await this.getUserCredits(userId);
      const tierInfo = USER_TIERS[userCredits.tier];
      
      if (tierInfo && tierInfo.monthlyCredits > 0) {
        // Set credits to monthly allowance
        const { error } = await supabase
          .from('users')
          .update({ 
            credits: tierInfo.monthlyCredits,
            last_credit_reset: new Date().toISOString().split('T')[0]
          })
          .eq('id', userId);

        if (error) throw error;

        // Record the reset transaction
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'monthly_reset',
            amount: tierInfo.monthlyCredits,
            description: `Monthly credit reset for ${tierInfo.name} plan`
          });

        return { success: true, newCredits: tierInfo.monthlyCredits };
      }

      return { success: false, error: 'No monthly credits to reset' };
    } catch (error) {
      console.error('Error resetting monthly credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user needs monthly credit reset
   */
  static async checkMonthlyReset(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('last_credit_reset, subscription_tier')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const lastReset = user.last_credit_reset ? new Date(user.last_credit_reset) : null;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Check if last reset was in a different month
      if (!lastReset || 
          lastReset.getMonth() !== currentMonth || 
          lastReset.getFullYear() !== currentYear) {
        
        // Only reset for paid tiers
        if (user.subscription_tier !== 'free') {
          return await this.resetMonthlyCredits(userId);
        }
      }

      return { success: false, error: 'No reset needed' };
    } catch (error) {
      console.error('Error checking monthly reset:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  CreditsManager,
  CREDIT_COSTS,
  USER_TIERS
};