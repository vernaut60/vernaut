export const idealCustomerProfileMockData = {
  section: "ideal_customer_profile",
  title: "📊 Your Ideal Customer Profile",
  introduction: "Based on your inputs, here's your target customer and what makes them ready to buy.",
  
  whoTheyAre: {
    title: "👥 Who They Are",
    demographics: {
      title: "📍 Demographics",
      content: "Organic farm managers and owners in California with 20-500 acres of high-value crops (grapes, berries, stone fruits). Typically 35-60 years old, tech-comfortable but not tech-native."
    },
    authority: {
      title: "🎯 Authority",
      content: "Most have agricultural degrees or 10+ years farming experience. They manage $500K-$5M annual revenue operations and make purchasing decisions for technology investments under $5K/year without additional approval."
    }
  },
  
  painPoints: {
    title: "💥 Their Top Pain Points",
    points: [
      {
        icon: "⏰",
        title: "Disease Detection Too Late",
        description: "By the time they notice visible disease symptoms, it's too late to prevent significant crop loss. Organic-approved treatments only work preventively, not curatively. Results in **10-30%** crop loss per season, costing **$15K-$150K** in revenue."
      },
      {
        icon: "🔧",
        title: "Limited Preventive Tools",
        description: "Current approach is manual field walking daily (**2-3 hours**) or waiting for obvious symptoms. Weather-based predictions are too generic. No tools specifically designed for organic farming constraints."
      },
      {
        icon: "📅",
        title: "Organic Treatment Window",
        description: "Organic fungicides/bactericides must be applied **5-7 days** BEFORE infection to work. Miss this window and there's no organic solution. Lose organic certification if forced to use conventional treatments."
      },
      {
        icon: "⚠️",
        title: "Certification Risk",
        description: "Disease outbreaks put organic certification at risk. Either lose crops or risk losing certification (worth **30-50%** price premium). High-stakes decision with imperfect information."
      }
    ]
  },
  
  buyingTriggers: {
    title: "⚡ Buying Triggers",
    intro: "They're ready to buy when:",
    triggers: [
      {
        text: "Just experienced major crop loss to disease (15%+ loss in past season) - pain is fresh",
        tags: ["Seasonal", "Pain-based"]
      },
      {
        text: "Start of growing season (March-April in CA) when planning preventive measures",
        tags: ["Seasonal"]
      },
      {
        text: "After attending ag conference/workshop where disease prevention was discussed",
        tags: ["Social Proof"]
      },
      {
        text: "Neighbor/peer had success with disease prevention tech (social proof matters)",
        tags: ["Social Proof"]
      },
      {
        text: "Weather patterns indicate high disease risk year (wet spring forecasts)",
        tags: ["Trigger"]
      },
      {
        text: "Expanding acreage or planting high-value crops where disease risk is unacceptable",
        tags: ["Growth"]
      }
    ]
  },
  
  whereTheySpendTime: {
    title: "🌐 Where They Spend Time",
    intro: "Understanding where your customers spend their time helps you prioritize which channels to focus on first.",
    
    categories: [
      {
        category: "Social Media",
        icon: "📱",
        description: "Daily engagement and networking",
        items: [
          { text: "Facebook farming groups", frequency: "daily" },
          { text: "LinkedIn for professional networking", frequency: "monthly" }
        ]
      },
      {
        category: "Online Communities & Forums",
        icon: "💬",
        description: "Where they seek advice and share experiences",
        items: [
          { text: "Reddit agriculture communities", frequency: "weekly" },
          { text: "Organic farming forums" },
          { text: "Crop-specific discussion boards" }
        ]
      },
      {
        category: "Content & Learning",
        icon: "📺",
        description: "Where they learn and discover solutions",
        items: [
          { text: "YouTube for farming techniques", frequency: "weekly" },
          { text: "Agricultural podcasts" },
          { text: "Industry newsletters" }
        ]
      },
      {
        category: "Professional Resources",
        icon: "📚",
        description: "Industry connections and official channels",
        items: [
          { text: "University ag extension programs" },
          { text: "Organic certification body communications" },
          { text: "Farming equipment dealer networks" }
        ]
      },
      {
        category: "In-Person Events",
        icon: "🤝",
        description: "Face-to-face networking and learning",
        items: [
          { text: "Annual organic farming conferences" },
          { text: "Monthly local grower meetings" },
          { text: "Weekly farmers markets" },
          { text: "Quarterly farm tours" }
        ]
      }
    ]
  },
  
  bottomNote: {
    icon: "💡",
    text: "These insights shape the 15 specific channels we've selected below."
  }
}
