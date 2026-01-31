/**
 * Oorja Knowledge Base — keyword-based Q&A for energy trading doubts.
 */

interface KBEntry {
  keywords: string[];
  answer: string;
}

const entries: KBEntry[] = [
  {
    keywords: ['what is p2p', 'peer to peer', 'p2p trading', 'what is energy trading', 'kya hai'],
    answer:
      'P2P (peer-to-peer) energy trading lets you sell your extra solar energy directly to your neighbors through the electricity grid. Instead of only selling to the power company at a low rate, you can set your own price and earn more!',
  },
  {
    keywords: ['price', 'pricing', 'rate', 'cost', 'how much per unit', 'kitna', 'daam'],
    answer:
      'You set your own price per kWh (unit). The current DISCOM rate is around Rs 10/kWh for consumers. Most sellers price between Rs 5-8/kWh, which is cheaper for buyers and more profitable for you than selling back to the grid at Rs 2/kWh!',
  },
  {
    keywords: ['discom', 'electricity board', 'bijli board', 'utility'],
    answer:
      'DISCOM is your local electricity distribution company. They manage the grid that delivers your energy. When you sell energy through P2P trading, DISCOM verifies that the energy was actually delivered through the grid.',
  },
  {
    keywords: ['trade limit', 'how much can i sell', 'kitna bech', 'limit', 'maximum'],
    answer:
      'Your trade limit depends on two things: your solar panel capacity (from your credential document) and your trust score. New sellers start at about 10% of their production. As you complete more trades successfully, your trust score and trade limit go up!',
  },
  {
    keywords: ['vc', 'credential', 'certificate', 'document', 'praman patra', 'generation profile'],
    answer:
      'A Verifiable Credential (VC) is a digital certificate that proves you own a solar panel and how much energy it can produce. Your DISCOM office provides this document. Think of it as an ID card for your solar panel!',
  },
  {
    keywords: ['wallet', 'balance', 'paisa', 'money', 'payment', 'paise'],
    answer:
      'Your wallet shows your account balance. When someone buys your energy, the payment is held safely (in escrow) until DISCOM confirms delivery. After verification, the money is released to your wallet.',
  },
  {
    keywords: ['trust', 'trust score', 'vishwas', 'reputation'],
    answer:
      'Your trust score (0-100%) shows how reliable you are as a seller. It starts at 30% for new users and increases when you successfully deliver energy. A higher trust score lets you sell more energy and makes buyers more likely to choose you.',
  },
  {
    keywords: ['escrow', 'safe', 'payment safe', 'security'],
    answer:
      "Escrow means the buyer's payment is held safely by the platform until DISCOM confirms you delivered the energy. This protects both you and the buyer. Once delivery is verified, you get paid automatically!",
  },
  {
    keywords: ['cancel', 'rdd karna', 'cancel order'],
    answer:
      'You can cancel an order within the cancellation window (usually 30 minutes). If you cancel as a seller, there is a small penalty. If the buyer cancels, you receive compensation. After the window closes, orders cannot be cancelled.',
  },
  {
    keywords: ['how does it work', 'process', 'steps', 'kaise kaam'],
    answer:
      'Here is how it works:\n1. You upload your solar panel credential (VC document)\n2. Your production capacity and trade limit are set automatically\n3. I create a sell offer with a fair price\n4. Buyers find and purchase your energy\n5. DISCOM verifies delivery through the grid\n6. Payment is released to your wallet!',
  },
  {
    keywords: ['help', 'madad', 'commands', 'kya kar sakte', 'what can you do'],
    answer:
      'Here is what I can help you with:\n- Check your earnings: "How much did I earn?"\n- Check your balance: "What is my balance?"\n- See your orders: "Show my orders"\n- Learn about trading: Ask any question!\n- Start selling: I can create offers for you',
  },
  {
    keywords: ['solar', 'panel', 'rooftop', 'installation'],
    answer:
      'Solar panels on your rooftop generate electricity from sunlight. Any electricity you generate beyond what you use at home is your surplus energy. You can sell this surplus to your neighbors through P2P trading and earn extra income!',
  },
];

export const knowledgeBase = {
  findAnswer(query: string): string | null {
    const lower = query.toLowerCase();
    for (const entry of entries) {
      if (entry.keywords.some((kw) => lower.includes(kw))) {
        return entry.answer;
      }
    }
    return null;
  },
};
