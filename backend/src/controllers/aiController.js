import Food from "../models/Food.js";
import FoodHistory from "../models/FoodHistory.js";

import { askGroq } from "../services/groqService.js";
import { getExpiryInfo } from "../utils/expiryUtils.js";

export const chatWithShelfLife = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    // =====================================
    // 1. GET LOGGED-IN USER'S PANTRY
    // =====================================

    const foods = await Food.find({
      userId: req.session.userId,
    });

    // =====================================
    // 2. CALCULATE EXPIRY INFORMATION
    // =====================================

    const foodsWithExpiry = foods.map((food) => {
      const expiryInfo = getExpiryInfo(
        food.expiryDate
      );

      return {
        name: food.name,
        quantity: food.quantity,
        category: food.category,
        storageLocation:
          food.storageLocation,
        expiryDate: food.expiryDate,
        daysRemaining:
          expiryInfo.daysRemaining,
        expiryStatus:
          expiryInfo.expiryStatus,
      };
    });

    // Active foods
    const activeFoods =
      foodsWithExpiry.filter(
        (food) =>
          food.expiryStatus !== "Expired"
      );

    //Prioritized foods 
    const prioritizedFoods = [...activeFoods].sort(
      (a, b) => a.daysRemaining - b.daysRemaining
    );

    // Expired foods
    const expiredFoods =
      foodsWithExpiry.filter(
        (food) =>
          food.expiryStatus === "Expired"
      );

    // =====================================
    // 3. GET RECENT HISTORY
    // =====================================

    const history = await FoodHistory.find({
      userId: req.session.userId,
    })
      .sort({
        actionDate: -1,
      })
      .limit(20);

    const consumedHistory =
      history.filter(
        (item) =>
          item.action === "CONSUMED"
      );

    const wastedHistory =
      history.filter(
        (item) =>
          item.action === "WASTED"
      );

    // =====================================
    // 4. CALCULATE SIMPLE TOTALS
    // =====================================

    const totalConsumed =
      consumedHistory.reduce(
        (total, item) =>
          total + item.quantity,
        0
      );

    const totalWasted =
      wastedHistory.reduce(
        (total, item) =>
          total + item.quantity,
        0
      );

    // =====================================
    // 5. CREATE AI CONTEXT
    // =====================================

    const pantryContext =
      prioritizedFoods.length > 0
        ? prioritizedFoods
            .map(
              (food) =>
                `- ${food.name}: quantity ${food.quantity}, category ${food.category}, stored in ${food.storageLocation}, ${food.daysRemaining} days remaining, status ${food.expiryStatus}`
            )
            .join("\n")
        : "No active pantry foods.";

    const expiredContext =
      expiredFoods.length > 0
        ? expiredFoods
            .map(
              (food) =>
                `- ${food.name}: quantity ${food.quantity}, expired ${Math.abs(
                  food.daysRemaining
                )} days ago`
            )
            .join("\n")
        : "No expired foods.";

    const wasteContext =
      wastedHistory.length > 0
        ? wastedHistory
            .map(
              (item) =>
                `- ${item.foodName}: quantity ${item.quantity}, reason ${item.wasteReason}`
            )
            .join("\n")
        : "No recorded waste.";

    // =====================================
    // 6. SEND CONTEXT + QUESTION TO GROQ
    // =====================================

    const answer = await askGroq([
      {
        role: "system",

        content: `
You are ShelfLife AI, a concise food-management assistant.

You have access to the logged-in user's ShelfLife data.

CURRENT ACTIVE PANTRY:
${pantryContext}

EXPIRED FOODS:
${expiredContext}

RECENT WASTE HISTORY:
${wasteContext}

HISTORY TOTALS:
Consumed quantity: ${totalConsumed}
Wasted quantity: ${totalWasted}

Your job is to help the user:
- decide which food to use first
- reduce food waste
- get meal ideas using food they actually have
- understand their expiry situation
- understand their waste habits

STRICT RULES:
- Use the ShelfLife data above when relevant.
- Never invent pantry items.
- If an ingredient is not listed, do not claim the user has it.
- Keep normal answers under 100 words.
- Prefer 3 to 5 short bullets.
- Give a maximum of 3 meal suggestions unless asked for more.
- Do not give full recipes unless asked.
- Use simple English.
- Do not create large tables unless requested.
- Do not claim expired food is definitely safe to eat.
- If food safety is uncertain, recommend checking package guidance, storage conditions, and signs of spoilage.
- When in doubt about expired food, recommend discarding it.
- When discussing waste patterns, use the exact waste history provided.
- Do not claim multiple foods are the "biggest" unless their wasted quantities are tied.
- Clearly distinguish between current pantry items and historical wasted items.
- Do not invent causes that are not supported by the wasteReason data.
- For waste analysis, use at most:
  3 short waste findings
  and 3 short recommendations.
- Keep the complete response under 120 words.
`,
      },

      {
        role: "user",
        content: message,
      },
    ]);

    res.status(200).json({
      reply: answer,
    });

  } catch (error) {
    console.error(
      "ShelfLife AI error:",
      error
    );

    res.status(500).json({
      message:
        "ShelfLife AI could not respond",
    });
  }
};

export const getFoodRecommendation = async (req, res) => {
  try {
    const food = await Food.findOne({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!food) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    const today = new Date();

    const prompt = `
The user has this food item in ShelfLife:

Food: ${food.name}
Quantity: ${food.quantity}
Category: ${food.category}
Storage: ${food.storageLocation}
Expiry date: ${food.expiryDate}
Current date: ${today.toISOString()}

Give a short, practical recommendation.

If the food is already past its expiry date, do not simply tell the user it is safe to eat.
Explain that food safety depends on the package label, storage conditions, and signs of spoilage.
If safety is uncertain, recommend discarding it.

Keep the answer short and easy to understand.
`;

    const answer = await askGroq([
      {
        role: "system",
        content:
          "You are ShelfLife AI, a helpful assistant for reducing food waste and managing food safely.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    res.status(200).json({
      food: food.name,
      recommendation: answer,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get AI recommendation",
    });
  }
};