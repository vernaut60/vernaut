export const mockNoDemoData = {
  // Basic info
  idea: {
    title: "AI Crop Management for Wine Growers",
    description: "AI-powered platform that helps wine grape farmers optimize irrigation, predict diseases, and increase yield quality using satellite imagery and weather data.",
    
    // Core idea breakdown (generated fresh - no demo)
    problem: "Wine grape farmers lack AI-powered tools for disease prediction and irrigation optimization, leading to crop losses and reduced vintage quality.",
    audience: "Organic wine grape growers in California with 10-200 acre vineyards, generating $500K-5M annual revenue, who prioritize sustainable farming practices.",
    solution: "An integrated AI platform using satellite imagery and weather data to provide early disease detection, irrigation recommendations, and vintage quality predictions through a simple mobile interface.",
    monetization: "Tiered SaaS subscription at $99-199/month per vineyard based on acreage, plus premium consulting services for harvest planning and vintage optimization."
  },
  
  // NO DEMO DATA - Direct sign-up or returning user
  demo: {
    exists: false
  },
  
  // Risk categories (no comparison data)
  risk_categories: {
    market_timing: {
      score: 6.5,
      demo_score: null,
      change: null,
      explanation: "Market conditions unchanged - AI adoption accelerating in agriculture"
    },
    competition_level: {
      score: 7.5,
      demo_score: null,
      change: null,
      explanation: "Competitive landscape unchanged - multiple established players exist"
    },
    business_viability: {
      score: 6.5,
      demo_score: null,
      change: null,
      explanation: "Your validation-first approach and budget improve viability"
    },
    execution_difficulty: {
      score: 4.5,
      demo_score: null,
      change: null,
      explanation: "Your tech background significantly reduces execution risk"
    }
  },
  
  // Stage 1 assessment (no comparison)
  stage1: {
    score: 87,
    risk_score: 6.5,
    label: "Personalized Assessment",
    
    // NO comparison data
    comparison: {
      has_demo: false
    },
    
    // Factors that influenced score (always present)
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
    
    verdict: "proceed",
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
  
  // KEEP: Competitors (full profiles)
  competitors: [
    {
      id: "farmlogs",
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
      market_position: "leader" as const,
      positioning: {
        target_market: "Mid-to-large farms (500-5000 acres) across all crop types",
        price_tier: "premium" as const,
        price_details: "$199/month",
        key_strengths: "Comprehensive field management with strong mobile apps and weather integration",
        company_stage: "well-funded" as const,
        geographic_focus: "US and Global"
      },
      threat_level: 8
    },
    {
      id: "agworld",
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
      market_position: "challenger" as const,
      positioning: {
        target_market: "Professional farm managers and agronomists requiring compliance tracking",
        price_tier: "mid-range" as const,
        price_details: "$149/month per user",
        key_strengths: "Strong compliance and reporting features with team collaboration tools",
        company_stage: "well-funded" as const,
        geographic_focus: "Global"
      },
      threat_level: 7
    },
    {
      id: "granular",
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
      market_position: "leader" as const,
      positioning: {
        target_market: "Large commercial farms and agribusinesses (5000+ acres)",
        price_tier: "enterprise" as const,
        price_details: "Custom enterprise pricing ($50K+ annual contracts)",
        key_strengths: "Enterprise-level financial planning and multi-farm operations management",
        company_stage: "enterprise" as const,
        geographic_focus: "US and Global"
      },
      threat_level: 9
    },
    {
      id: "cropwise",
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
      market_position: "challenger" as const,
      positioning: {
        target_market: "Row crop farmers (corn, soybeans, wheat) focusing on precision agriculture",
        price_tier: "mid-range" as const,
        price_details: "$8-12/acre/year",
        key_strengths: "Advanced satellite imagery and variable rate technology for row crops",
        company_stage: "well-funded" as const,
        geographic_focus: "US and Europe"
      },
      threat_level: 6
    },
    {
      id: "fieldview",
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
      market_position: "leader" as const,
      positioning: {
        target_market: "All farmers seeking free-to-start field management with equipment integration",
        price_tier: "budget" as const,
        price_details: "Free tier + $5-7/acre premium features",
        key_strengths: "Free entry point with strong equipment integration and Bayer backing",
        company_stage: "enterprise" as const,
        geographic_focus: "Global"
      },
      threat_level: 9
    }
  ],
  
  // KEEP: Recommendation (proceed/pivot decision)
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
      "Complete the 7-question wizard to unlock your personalized execution playbook",
      "Stage 2: Define your precise ICP (not just 'wine farmers' but which type exactly)",
      "Stage 3: Run 3-week demand test to validate willingness to pay",
      "Stage 4: Access 15+ channels to find your first customers"
    ]
  },
  
  // Locked stages for paywall
  locked_stages: [
    {
      id: "2",
      title: "Define Your Ideal Customer Profile",
      description: "Get crystal clear on exactly who you're serving",
      teaser: "Stop guessing who your customers are. Get a detailed ICP framework that helps you identify, reach, and convert your perfect customers.",
      lockedContent: "Detailed customer persona templates, market sizing methodology, customer interview scripts, and validation frameworks to ensure you're building for the right people.",
      estimatedTime: "1-2 weeks",
      value: "$2,000"
    },
    {
      id: "3",
      title: "Validate Demand Before Building",
      description: "Test willingness to pay before writing code",
      teaser: "Don't build in the dark. Learn proven methods to validate demand and get pre-orders before you start development.",
      lockedContent: "Pre-launch validation strategies, landing page optimization, email sequence templates, and conversion tracking to prove demand exists before you build.",
      estimatedTime: "2-3 weeks",
      value: "$3,000"
    },
    {
      id: "4",
      title: "Find Your First Customers",
      description: "15+ channels to acquire your first 100 customers",
      teaser: "Skip the guesswork on customer acquisition. Get a proven playbook with 15+ channels, specific tactics, and step-by-step implementation guides.",
      lockedContent: "Channel-specific strategies for LinkedIn, cold email, partnerships, content marketing, and community building. Includes templates, scripts, and tracking systems.",
      estimatedTime: "4-6 weeks",
      value: "$5,000"
    },
    {
      id: "5",
      title: "Build Your MVP",
      description: "Technical roadmap and development strategy",
      teaser: "Build the right features in the right order. Get a technical roadmap that focuses on core value delivery and rapid iteration.",
      lockedContent: "Feature prioritization framework, technical architecture recommendations, development timeline, and testing strategies to build efficiently.",
      estimatedTime: "8-12 weeks",
      value: "$10,000"
    },
    {
      id: "6",
      title: "Launch & Iterate",
      description: "Go-to-market strategy and growth optimization",
      teaser: "Launch with confidence. Get a complete go-to-market playbook with launch sequences, growth tactics, and iteration frameworks.",
      lockedContent: "Launch sequence templates, growth experiment frameworks, user feedback systems, and iteration methodologies to scale efficiently.",
      estimatedTime: "4-8 weeks",
      value: "$7,000"
    },
    {
      id: "7",
      title: "Scale to $10K MRR",
      description: "Systems and processes for sustainable growth",
      teaser: "Build systems that scale. Get proven frameworks for customer success, operations, and growth that take you from $1K to $10K MRR.",
      lockedContent: "Customer success playbooks, operational systems, growth frameworks, and scaling strategies to build a sustainable, profitable business.",
      estimatedTime: "3-6 months",
      value: "$15,000"
    }
  ]
}
