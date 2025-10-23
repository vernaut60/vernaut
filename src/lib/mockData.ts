export const mockStage1Data = {
  // Basic info
  idea: {
    title: "AI Crop Management for Wine Growers",
    description: "AI-powered platform that helps wine grape farmers optimize irrigation, predict diseases, and increase yield quality using satellite imagery and weather data.",
    
    // Core idea breakdown (from demo or generated fresh if no demo)
    // These stay SAME - never regenerate
    problem: "Wine grape farmers lack AI-powered tools for disease prediction and irrigation optimization, leading to crop losses and reduced vintage quality.",
    audience: "Organic wine grape growers in California with 10-200 acre vineyards, generating $500K-5M annual revenue, who prioritize sustainable farming practices.",
    solution: "An integrated AI platform using satellite imagery and weather data to provide early disease detection, irrigation recommendations, and vintage quality predictions through a simple mobile interface.",
    monetization: "Tiered SaaS subscription at $99-199/month per vineyard based on acreage, plus premium consulting services for harvest planning and vintage optimization."
  },
  
  // Demo data (nullable - might not exist)
  demo: {
    exists: true, // or false if no demo
    score: 85,
    risk_score: 6.9,
    label: "Preliminary Assessment",
    generated_at: "2024-12-15T10:00:00Z"
  },
  
  // Risk categories (with demo comparison if available)
  risk_categories: {
    market_timing: {
      score: 6.5,
      demo_score: 6.5, // null if no demo
      change: 0, // null if no demo
      explanation: "Market conditions unchanged - AI adoption accelerating in agriculture"
    },
    competition_level: {
      score: 7.5,
      demo_score: 7.5, // null if no demo
      change: 0, // null if no demo
      explanation: "Competitive landscape unchanged - multiple established players exist"
    },
    business_viability: {
      score: 6.5,
      demo_score: 7.0, // null if no demo
      change: -0.5, // null if no demo
      explanation: "Your validation-first approach and budget improve viability"
    },
    execution_difficulty: {
      score: 4.5,
      demo_score: 6.0, // null if no demo
      change: -1.5, // null if no demo
      explanation: "Your tech background significantly reduces execution risk"
    }
  },
  
  // Stage 1 assessment
  stage1: {
    score: 87,
    risk_score: 6.5,
    label: "Personalized Assessment",
    
    // Comparison (if demo exists)
    comparison: {
      has_demo: true,
      demo_score: 85,
      score_difference: +2,
      demo_risk: 6.9,
      risk_difference: -0.4,
      message: "Your personalized analysis improved the score by +2 points based on your specific background and approach."
    },
    
    // Factors that influenced score (always present, even without demo)
    score_factors: [
      {
        factor: "Relevant tech background",
        impact: "reduces development risk",
        category: "execution"
      },
      {
        factor: "California location",
        impact: "established wine market with existing customer base",
        category: "market"
      },
      {
        factor: "Validation-first approach",
        impact: "lowers market risk through early customer feedback",
        category: "business"
      }
    ],
    
    verdict: "proceed", // proceed, pivot, needs_work
    verdict_label: "Strong Potential",
    confidence: 78
  },
  
  // Top 3 risks with PERSONALIZED mitigation
  top_risks: [
    {
      title: "High Competition",
      severity: 7.5,
      category: "Competition",
      why_it_matters: "Multiple established players (FarmLogs, AgWorld) have 10+ years in market with strong customer bases. They have more resources and brand recognition.",
      mitigation_steps: [
        "Focus exclusively on wine grapes (underserved niche)",
        "Partner with 2-3 California vineyards for co-design and early case studies",
        "Offer free tier for first 10 vineyards to build social proof",
        "Emphasize AI-specific features (disease prediction) that legacy tools lack"
      ],
      timeline: "Month 1-2"
    },
    {
      title: "Limited Agriculture Experience",
      severity: 6.5,
      category: "Domain Knowledge",
      why_it_matters: "Software background without agriculture expertise could lead to building features farmers don't actually need or missing critical workflows.",
      mitigation_steps: [
        "Hire ag consultant ($2,000 budget) for first 3 months",
        "Shadow 3 wine grape farmers for 1 week each during harvest season",
        "Join California wine grower associations (early access to network)",
        "Run weekly validation calls with 5 target customers"
      ],
      timeline: "Month 1"
    },
    {
      title: "Regulatory Compliance Complexity",
      severity: 6.0,
      category: "Legal",
      why_it_matters: "Agriculture has strict data privacy, chemical usage reporting, and organic certification requirements that vary by state.",
      mitigation_steps: [
        "Consult with agriculture compliance lawyer ($1,500)",
        "Partner with existing compliance software (don't build from scratch)",
        "Focus on California only initially (single regulatory framework)",
        "Get organic certification consultant on advisory board"
      ],
      timeline: "Month 2-3"
    }
  ],
  
  // Full competitor details (NOT in demo)
  competitors: [
    {
      name: "FarmLogs",
      website: "https://farmlogs.com",
      pricing: "$199/month",
      key_features: [
        "Field mapping and boundaries",
        "Pest and disease tracking",
        "Harvest forecasting",
        "Weather integration",
        "Activity logging"
      ],
      your_advantage: "FarmLogs serves all crops broadly. You can specialize in wine grapes with variety-specific disease models and vintage quality predictions that matter to premium winemakers.",
      market_position: "leader"
    },
    {
      name: "AgWorld",
      website: "https://agworld.com",
      pricing: "$149/month per user",
      key_features: [
        "Crop planning and budgeting",
        "Chemical application tracking",
        "Team collaboration tools",
        "Compliance reporting",
        "Mobile apps"
      ],
      your_advantage: "AgWorld is strong on compliance but weak on AI/predictive features. Your satellite imagery + weather data analysis provides proactive insights they can't match.",
      market_position: "challenger"
    },
    {
      name: "Granular (Corteva)",
      website: "https://granular.ag",
      pricing: "Custom enterprise pricing",
      key_features: [
        "Enterprise-level farm management",
        "Financial planning",
        "Inventory management",
        "Market data integration",
        "Multi-farm operations"
      ],
      your_advantage: "Granular targets massive commercial farms ($50K+ budgets). You can win small-to-medium vineyards (10-200 acres) with affordable pricing and simpler UX.",
      market_position: "leader"
    },
    {
      name: "Cropwise",
      website: "https://cropwise.com",
      pricing: "$8-12/acre/year",
      key_features: [
        "Satellite imagery analysis",
        "Variable rate prescriptions",
        "Scouting tools",
        "Yield mapping",
        "Analytics dashboard"
      ],
      your_advantage: "Cropwise has good imagery but focuses on row crops (corn, soybeans). Wine grapes have unique needs (vintage quality, sugar content tracking) that you'll specialize in.",
      market_position: "challenger"
    },
    {
      name: "Climate FieldView",
      website: "https://climate.com/fieldview",
      pricing: "Free tier + $5-7/acre premium",
      key_features: [
        "Field health monitoring",
        "Planting and harvest data",
        "Nitrogen management",
        "Equipment integration",
        "Historical data analysis"
      ],
      your_advantage: "FieldView is backed by Bayer (deep pockets) but is generic. Your wine-specific AI models for disease prediction and irrigation optimization will be more accurate for vineyards.",
      market_position: "leader"
    }
  ],
  
  // Recommendation (NOT in demo)
  recommendation: {
    verdict: "proceed",
    confidence: 78,
    summary: "This idea has strong potential in a proven market with clear differentiation opportunities. Wine grape farming is a premium, tech-underserved niche where specialized AI tools can command higher prices than commodity crop solutions.",
    conditions: [
      "Niche down to wine grapes exclusively (don't try to serve all agriculture)",
      "Partner with 2-3 vineyards from the start for co-design and validation",
      "Validate demand before building - get 10 letters of intent from target customers",
      "Hire or partner with someone who has wine/agriculture domain expertise",
      "Start with one geographic region (California) to simplify compliance"
    ],
    next_steps: [
      "Stage 2: Define your precise ICP (not just 'wine farmers' but which type exactly)",
      "Stage 3: Run 3-week demand test to validate willingness to pay",
      "Stage 4: Access 15+ channels to find your first customers",
      "Stage 5: Build your MVP roadmap with prioritized features",
      "Stage 6: Launch strategy and early customer acquisition",
      "Stage 7: Scale plan and growth metrics"
    ]
  }
}
