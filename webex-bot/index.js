//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework
require("dotenv").config();
var framework = require("webex-node-bot-framework");
var webhook = require("webex-node-bot-framework/webhook");
var express = require("express");
var bodyParser = require("body-parser");
var https = require("https");
var http = require("http");
var app = express();
app.use(bodyParser.json());
app.use(express.static("images"));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

const config = {
  token: process.env.BOTTOKEN,
  port: process.env.PORT || 3000,  // Default to 3000 if not set
};

// Only pass the webhook URL if it has been set in the environment
if (process.env.WEBHOOKURL) {
  config.webhookUrl = process.env.WEBHOOKURL;
  config.webhookRequestJSONLocation = "body"; // Tell framework where to find webhook JSON
  console.log("🔗 Webhook mode enabled with URL:", config.webhookUrl);
} else {
  console.log("🔌 Using websocket mode (no WEBHOOKURL set)");
}

// n8n webhook configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!N8N_WEBHOOK_URL) {
  console.warn("N8N_WEBHOOK_URL not set - test failure workflows will not trigger");
}

// Function to trigger n8n workflow
function triggerN8nWorkflow(testData) {
  return triggerN8nWorkflowWithUrl(testData, N8N_WEBHOOK_URL);
}

// Function to trigger n8n workflow with custom URL
function triggerN8nWorkflowWithUrl(testData, webhookUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('n8n workflow triggered successfully');
          resolve(data);
        } else {
          console.error(`n8n workflow trigger failed with status: ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error triggering n8n workflow:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}


// init framework
var framework = new framework(config);
framework.start();
console.log("Starting framework, please wait...");

framework.on("initialized", () => {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

// A spawn event is generated when the framework finds a space with your bot in it
// If actorId is set, it means that user has just added your bot to a new space
// If not, the framework has discovered your bot in an existing space
framework.on("spawn", (bot, id, actorId) => {
  if (!actorId) {
    // don't say anything here or your bot's spaces will get
    // spammed every time your server is restarted
    console.log(
      `While starting up, the framework found our bot in a space called: ${bot.room.title}`
    );
  } else {
    // When actorId is present it means someone added your bot got added to a new space
    // Lets find out more about them..
    var msg =
      "You can say `help` to get the list of words I am able to respond to.";
    bot.webex.people
      .get(actorId)
      .then((user) => {
        msg = `Hello there ${user.displayName}. ${msg}`;
      })
      .catch((e) => {
        console.error(
          `Failed to lookup user details in framwork.on("spawn"): ${e.message}`
        );
        msg = `Hello there. ${msg}`;
      })
      .finally(() => {
        // Say hello, and tell users what you do!
        if (bot.isDirect) {
          bot.say("markdown", msg);
        } else {
          let botName = bot.person.displayName;
          msg += `\n\nDon't forget, in order for me to see your messages in this group space, be sure to *@mention* ${botName}.`;
          bot.say("markdown", msg);
        }
      });
  }
});

// Implementing a framework.on('log') handler allows you to capture
// events emitted from the framework.  Its a handy way to better understand
// what the framework is doing when first getting started, and a great
// way to troubleshoot issues.
// You may wish to disable this for production apps
framework.on("log", (msg) => {
  console.log(msg);
});

console.log("Bot is ready to receive attachmentActions events...");

// Handle Adaptive Card button submissions
framework.on("attachmentActions", (bot, trigger) => {
  console.log("=========================================");
  console.log("CARD ACTION RECEIVED!");
  console.log("Full trigger:", JSON.stringify(trigger, null, 2));
  console.log("Attachment action:", JSON.stringify(trigger.attachmentAction, null, 2));
  console.log("=========================================");
  
  const actionData = trigger.attachmentAction.inputs;
  console.log("Action data inputs:", JSON.stringify(actionData, null, 2));
  
  // Handle Create Jira Ticket button
  if (actionData.action === "create_jira") {
    console.log("Create Jira ticket action triggered");
    
    // Prepare data for Jira creation workflow
    const jiraData = {
      action: "create_jira",
      testCase: actionData.testCase,
      analysis: actionData.analysis,
      projectId: actionData.projectId,
      testcaseId: actionData.testcaseId,
      room: bot.room.title,
      roomId: bot.room.id,
      messageId: trigger.message.id,
      personId: trigger.person.id,
      personEmail: trigger.person.emails[0],
      personName: trigger.person.displayName,
      timestamp: new Date().toISOString()
    };
    
    // Use separate Jira webhook URL
    const jiraWebhookUrl = process.env.N8N_JIRA_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    
    // Trigger Jira workflow with custom URL
    triggerN8nWorkflowWithUrl(jiraData, jiraWebhookUrl)
      .then(() => {
        console.log("Jira creation workflow triggered successfully");
        bot.say("🎫 Creating Jira ticket...");
      })
      .catch((error) => {
        console.error("Failed to trigger Jira workflow:", error.message);
        bot.say("⚠️ Failed to create Jira ticket. Please try again or contact support.");
      });
  }
  
  // Handle Reset Device Config button
  if (actionData.action === "reset_device_config") {
    console.log("Reset Device Config action triggered");
    
    // Prepare data for reset workflow
    const resetData = {
      action: "reset_device_config",
      testCase: actionData.testCase,
      analysis: actionData.analysis,
      jiraKey: actionData.jiraKey,
      projectId: actionData.projectId,
      testcaseId: actionData.testcaseId,
      room: bot.room.title,
      roomId: bot.room.id,
      messageId: trigger.message.id,
      personId: trigger.person.id,
      personEmail: trigger.person.emails[0],
      personName: trigger.person.displayName,
      timestamp: new Date().toISOString()
    };
    
    // Use reset webhook URL (can be configured separately)
    const resetWebhookUrl = process.env.N8N_RESET_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    
    // Trigger reset workflow
    triggerN8nWorkflowWithUrl(resetData, resetWebhookUrl)
      .then(() => {
        console.log("Reset device config workflow triggered successfully");
        bot.say("🔄 Triggering device config reset...");
      })
      .catch((error) => {
        console.error("Failed to trigger reset workflow:", error.message);
        bot.say("⚠️ Failed to trigger device reset. Please try again or contact support.");
      });
  }

  // Handle Apply Recommended Fix button
  if (actionData.action === "apply_fix") {
    console.log("Apply Recommended Fix action triggered");
    
    // Prepare data for apply fix workflow
    const fixData = {
      action: "apply_fix",
      testCase: actionData.testCase,
      analysis: actionData.analysis,
      jiraKey: actionData.jiraKey,
      projectId: actionData.projectId,
      testcaseId: actionData.testcaseId,
      room: bot.room.title,
      roomId: bot.room.id,
      messageId: trigger.message.id,
      personId: trigger.person.id,
      personEmail: trigger.person.emails[0],
      personName: trigger.person.displayName,
      timestamp: new Date().toISOString()
    };
    
    // Use fix webhook URL (can be configured separately)
    const fixWebhookUrl = process.env.N8N_FIX_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    
    // Trigger fix workflow
    triggerN8nWorkflowWithUrl(fixData, fixWebhookUrl)
      .then(() => {
        console.log("Apply fix workflow triggered successfully");
        bot.say("🔧 Applying AI-recommended fix...");
      })
      .catch((error) => {
        console.error("Failed to trigger fix workflow:", error.message);
        bot.say("⚠️ Failed to apply fix. Please try again or contact support.");
      });
  }

  // Handle feedback buttons
  if (actionData.feedback) {
    console.log(`Feedback received: ${actionData.feedback} for test: ${actionData.testCase}`);
    
    const feedbackEmoji = {
      helpful: "👍",
      not_helpful: "👎",
      needs_more_info: "💬"
    };
    
    const emoji = feedbackEmoji[actionData.feedback] || "📝";
    bot.say(`${emoji} Thank you for your feedback!`);
    
    // Optional: Log feedback to analytics/database
    console.log(`Feedback logged: ${actionData.feedback} for ${actionData.testCase}`);
  }
});

// Process incoming messages
// Each hears() call includes the phrase to match, and the function to call if webex mesages
// to the bot match that phrase.
// An optional 3rd parameter can be a help string used by the frameworks.showHelp message.
// An optional fourth (or 3rd param if no help message is supplied) is an integer that
// specifies priority.   If multiple handlers match they will all be called unless the priority
// was specified, in which case, only the handler(s) with the lowest priority will be called

/* Test case result detection - triggers n8n workflow for failures only
   CXTM should @mention the bot with test results
   ex: @botname Testcase result for "Test Name" has been created!
*/
framework.hears(
  /testcase result|test.*result|result:.*passed|result:.*failed/i,
  (bot, trigger) => {
    console.log("Test case result detected via @mention:", trigger.text);
    
    const messageText = trigger.text;
    const messageLower = messageText.toLowerCase();
    
    // Get HTML version of message which contains the actual URLs
    const messageHtml = trigger.message.html || '';
    console.log("🔍 Message HTML:", messageHtml);
    
    // Parse result status from the message
    let resultStatus = "unknown";
    if (messageLower.includes("result: passed")) {
      resultStatus = "passed";
    } else if (messageLower.includes("result: failed")) {
      resultStatus = "failed";
    }
    
    // Extract test case name from the message
    const testNameMatch = messageText.match(/testcase result for ["']([^"']+)["']/i);
    const testCaseName = testNameMatch ? testNameMatch[1] : null;
    
    // Extract CXTM testcase URL from HTML (e.g., https://cxtm.cisco.com/projects/22620/testcases/1891158)
    const cxtmUrlMatch = messageHtml.match(/https:\/\/cxtm\.cisco\.com\/projects\/(\d+)\/testcases\/(\d+)/i);
    const cxtmUrl = cxtmUrlMatch ? cxtmUrlMatch[0] : null;
    const projectIdFromUrl = cxtmUrlMatch ? cxtmUrlMatch[1] : null;
    const testcaseIdFromUrl = cxtmUrlMatch ? cxtmUrlMatch[2] : null;
    
    // Debug: log the URL extraction
    console.log("🔍 CXTM URL regex match:", cxtmUrlMatch);
    console.log("🔍 Extracted from HTML - projectId:", projectIdFromUrl, "testcaseId:", testcaseIdFromUrl);
    
    // Extract project ID from the message (ID: 22620) as fallback
    const projectIdMatch = messageText.match(/ID:\s*(\d+)/);
    const projectId = projectIdFromUrl || (projectIdMatch ? projectIdMatch[1] : null);
    
    // Use testcase ID from URL
    const testcaseId = testcaseIdFromUrl;
    
    console.log("🔍 Final - projectId:", projectId, "testcaseId:", testcaseId);
    
    // Extract group/testcase ID if present in message (legacy fallback)
    const groupIdMatch = messageText.match(/group[:\s]+(\d+)/i);
    const groupId = groupIdMatch ? groupIdMatch[1] : null;
    
    // Extract modified by
    const modifiedByMatch = messageText.match(/Modified By:\s*([^\n]+)/);
    const modifiedBy = modifiedByMatch ? modifiedByMatch[1].trim() : null;
    
    console.log(`Test result: ${resultStatus}, Test case: ${testCaseName}, Testcase ID: ${testcaseId}, Project ID: ${projectId}`);
    console.log(`CXTM URL: ${cxtmUrl}`);
    
    // Handle passed tests - just acknowledge
    if (resultStatus === "passed") {
      bot.say(`✅ **${testCaseName}** passed! Looks good! 👍`);
      return;
    }
    
    // Handle failed tests - trigger n8n workflow
    if (resultStatus === "failed") {
      // Extract test information from the message
      const testData = {
        action: "test_failure",
        message: messageText,
        resultStatus: resultStatus,
        testCaseName: testCaseName,
        projectId: projectId,
        testcaseId: testcaseId,
        cxtmUrl: cxtmUrl,
        groupId: groupId,
        modifiedBy: modifiedBy,
        room: bot.room.title,
        roomId: bot.room.id,
        timestamp: new Date().toISOString(),
        sender: trigger.person.displayName,
        senderEmail: trigger.person.emails[0],
        messageId: trigger.message.id
      };

      console.log("Test failure detected. Triggering workflow:", JSON.stringify(testData, null, 2));

      // Trigger n8n workflow
      triggerN8nWorkflow(testData)
        .then(() => {
          console.log("n8n workflow triggered successfully for test failure");
          bot.say(`🚨 **${testCaseName}** failed! Analyzing logs and generating report...`);
        })
        .catch((error) => {
          console.error("Failed to trigger n8n workflow:", error.message);
          bot.say("⚠️ Test failure detected but workflow trigger failed. Please check n8n connection.");
        });
    } else {
      // Unknown status
      bot.say("📊 Test result received, but status could not be determined.");
    }
  },
  "**test result**: (acknowledges passed tests, triggers analysis workflow for failures)",
  0
);

/* On mention with command
ex User enters @botname framework, the bot will write back in markdown
*/
framework.hears(
  "framework",
  (bot) => {
    console.log("framework command received");
    bot.say(
      "markdown",
      "The primary purpose for the [webex-node-bot-framework](https://github.com/WebexCommunity/webex-node-bot-framework) was to create a framework based on the [webex-jssdk](https://webex.github.io/webex-js-sdk) which continues to be supported as new features and functionality are added to Webex. This version of the project was designed with two themes in mind: \n\n\n * Mimimize Webex API Calls. The original flint could be quite slow as it attempted to provide bot developers rich details about the space, membership, message and message author. This version eliminates some of that data in the interests of efficiency, (but provides convenience methods to enable bot developers to get this information if it is required)\n * Leverage native Webex data types. The original flint would copy details from the webex objects such as message and person into various flint objects. This version simply attaches the native Webex objects. This increases the framework's efficiency and makes it future proof as new attributes are added to the various webex DTOs "
    );
  },
  "**framework**: (learn more about the Webex Bot Framework)",
  0
);

/* On mention with command, using other trigger data, can use lite markdown formatting
ex User enters @botname 'info' phrase, the bot will provide personal details
*/
framework.hears(
  "info",
  (bot, trigger) => {
    console.log("info command received");
    //the "trigger" parameter gives you access to data about the user who entered the command
    let personAvatar = trigger.person.avatar;
    let personEmail = trigger.person.emails[0];
    let personDisplayName = trigger.person.displayName;
    let outputString = `Here is your personal information: \n\n\n **Name:** ${personDisplayName}  \n\n\n **Email:** ${personEmail} \n\n\n **Avatar URL:** ${personAvatar}`;
    bot.say("markdown", outputString);
  },
  "**info**: (get your personal details)",
  0
);

/* On mention with bot data
ex User enters @botname 'space' phrase, the bot will provide details about that particular space
*/
framework.hears(
  "space",
  (bot) => {
    console.log("space. the final frontier");
    let roomTitle = bot.room.title;
    let spaceID = bot.room.id;
    let roomType = bot.room.type;

    let outputString = `The title of this space: ${roomTitle} \n\n The roomID of this space: ${spaceID} \n\n The type of this space: ${roomType}`;

    console.log(outputString);
    bot
      .say("markdown", outputString)
      .catch((e) => console.error(`bot.say failed: ${e.message}`));
  },
  "**space**: (get details about this space) ",
  0
);

/*
   Say hi to every member in the space
   This demonstrates how developers can access the webex
   sdk to call any Webex API.  API Doc: https://webex.github.io/webex-js-sdk/api/
*/
framework.hears(
  "say hi to everyone",
  (bot) => {
    console.log("say hi to everyone.  Its a party");
    // Use the webex SDK to get the list of users in this space
    bot.webex.memberships
      .list({ roomId: bot.room.id })
      .then((memberships) => {
        for (const member of memberships.items) {
          if (member.personId === bot.person.id) {
            // Skip myself!
            continue;
          }
          let displayName = member.personDisplayName
            ? member.personDisplayName
            : member.personEmail;
          bot.say(`Hello ${displayName}`);
        }
      })
      .catch((e) => {
        console.error(`Call to sdk.memberships.get() failed: ${e.messages}`);
        bot.say("Hello everybody!");
      });
  },
  "**say hi to everyone**: (everyone gets a greeting using a call to the Webex SDK)",
  0
);

// Buttons & Cards data
let cardJSON = {
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.0",
  body: [
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: "5",
          items: [
            {
              type: "Image",
              url: "Your avatar appears here!",
              size: "large",
              horizontalAlignment: "Center",
              style: "person",
            },
            {
              type: "TextBlock",
              text: "Your name will be here!",
              size: "medium",
              horizontalAlignment: "Center",
              weight: "Bolder",
            },
            {
              type: "TextBlock",
              text: "And your email goes here!",
              size: "small",
              horizontalAlignment: "Center",
              isSubtle: true,
              wrap: false,
            },
          ],
        },
      ],
    },
  ],
};

/* On mention with card example
ex User enters @botname 'card me' phrase, the bot will produce a personalized card - https://developer.webex.com/docs/api/guides/cards
*/
framework.hears(
  "card me",
  (bot, trigger) => {
    console.log("someone asked for a card");
    let avatar = trigger.person.avatar;

    cardJSON.body[0].columns[0].items[0].url = avatar
      ? avatar
      : `${config.webhookUrl}/missing-avatar.jpg`;
    cardJSON.body[0].columns[0].items[1].text = trigger.person.displayName;
    cardJSON.body[0].columns[0].items[2].text = trigger.person.emails[0];
    bot.sendCard(
      cardJSON,
      "This is customizable fallback text for clients that do not support buttons & cards"
    );
  },
  "**card me**: (a cool card!)",
  0
);

/* On mention reply example
ex User enters @botname 'reply' phrase, the bot will post a threaded reply
*/
framework.hears(
  "reply",
  (bot, trigger) => {
    console.log("someone asked for a reply.  We will give them two.");
    bot.reply(
      trigger.message,
      "This is threaded reply sent using the `bot.reply()` method.",
      "markdown"
    );
    var msg_attach = {
      text: "This is also threaded reply with an attachment sent via bot.reply(): ",
      file: "https://media2.giphy.com/media/dTJd5ygpxkzWo/giphy-downsized-medium.gif",
    };
    bot.reply(trigger.message, msg_attach);
  },
  "**reply**: (have bot reply to your message)",
  0
);

/* On mention with command
ex User enters @botname help, the bot will write back in markdown
 *
 * The framework.showHelp method will use the help phrases supplied with the previous
 * framework.hears() commands
*/
framework.hears(
  /help|what can i (do|say)|what (can|do) you do/i,
  (bot, trigger) => {
    console.log(`someone needs help! They asked ${trigger.text}`);
    bot
      .say(`Hello ${trigger.person.displayName}.`)
      //    .then(() => sendHelp(bot))
      .then(() => bot.say("markdown", framework.showHelp()))
      .catch((e) => console.error(`Problem in help hander: ${e.message}`));
  },
  "**help**: (what you are reading now)",
  0
);

/* On mention with unexpected bot command
   Its a good practice is to gracefully handle unexpected input
   Setting the priority to a higher number here ensures that other
   handlers with lower priority will be called instead if there is another match
*/
framework.hears(
  /.*/,
  (bot, trigger) => {
    // This will fire for any input so only respond if we haven't already
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot
      .say(`Sorry, I don't know how to respond to "${trigger.text}"`)
      .then(() => bot.say("markdown", framework.showHelp()))
      //    .then(() => sendHelp(bot))
      .catch((e) =>
        console.error(`Problem in the unexepected command hander: ${e.message}`)
      );
  },
  99999
);

//Server config & housekeeping
// Health Check
app.get("/", (req, res) => {
  res.send(`I'm alive.`);
});

// Endpoint to receive card data from n8n and post it via bot
app.post("/post-card", (req, res) => {
  console.log("Received card post request from n8n");
  const { roomId, cardData, fallbackText } = req.body;
  
  if (!roomId || !cardData) {
    console.error("Missing roomId or cardData in request");
    return res.status(400).json({ error: "roomId and cardData are required" });
  }
  
  // Find the bot instance for this room
  const bot = framework.getBotByRoomId(roomId);
  
  if (!bot) {
    console.error(`No bot found for room: ${roomId}`);
    return res.status(404).json({ error: "Bot not found in specified room" });
  }
  
  // Post the card using the bot framework
  bot.sendCard(
    cardData,
    fallbackText || "AI Analysis Report"
  )
    .then(() => {
      console.log("Card posted successfully via bot");
      res.json({ success: true, message: "Card posted" });
    })
    .catch((error) => {
      console.error("Failed to post card:", error.message);
      res.status(500).json({ error: "Failed to post card", details: error.message });
    });
});

app.post("/", (req, res, next) => {
  console.log("🔔 Webhook received:", JSON.stringify(req.body, null, 2));
  
  // Manually handle attachmentActions if framework doesn't
  if (req.body && req.body.resource === "attachmentActions" && req.body.event === "created") {
    console.log("⚡ Manually processing attachmentAction webhook");
    
    const attachmentActionId = req.body.data.id;
    
    // Fetch the attachment action details from Webex API
    const https = require('https');
    const options = {
      hostname: 'webexapis.com',
      path: `/v1/attachment/actions/${attachmentActionId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.BOTTOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => { data += chunk; });
      apiRes.on('end', () => {
        try {
          const actionData = JSON.parse(data);
          console.log("📋 Attachment action data:", JSON.stringify(actionData, null, 2));
          
          // Check if it's a Create Jira action
          if (actionData.inputs && actionData.inputs.action === "create_jira") {
            console.log("🎫 Create Jira ticket action triggered!");
            console.log("📋 jobfileId from card:", actionData.inputs.jobfileId);
            
            const jiraData = {
              action: "create_jira",
              testCase: actionData.inputs.testCase,
              analysis: actionData.inputs.analysis,
              projectId: actionData.inputs.projectId,
              testcaseId: actionData.inputs.testcaseId,
              jobfileId: actionData.inputs.jobfileId,
              roomId: actionData.roomId,
              messageId: actionData.messageId,
              personId: actionData.personId,
              timestamp: new Date().toISOString()
            };
            
            const jiraWebhookUrl = process.env.N8N_JIRA_WEBHOOK_URL || N8N_WEBHOOK_URL;
            triggerN8nWorkflowWithUrl(jiraData, jiraWebhookUrl)
              .then(() => console.log("✅ n8n Jira workflow triggered successfully"))
              .catch((error) => console.error("❌ Failed to trigger n8n Jira workflow:", error.message));
          }
          
          // Check if it's a Reset Device Config action
          if (actionData.inputs && actionData.inputs.action === "reset_device_config") {
            console.log("🔄 Reset Device Config action triggered!");
            console.log("📋 jobfileId from card:", actionData.inputs.jobfileId);
            
            const resetData = {
              action: "reset_device_config",
              testCase: actionData.inputs.testCase,
              analysis: actionData.inputs.analysis,
              jiraKey: actionData.inputs.jiraKey,
              jobfileId: actionData.inputs.jobfileId,
              projectId: actionData.inputs.projectId,
              testcaseId: actionData.inputs.testcaseId,
              roomId: actionData.roomId,
              messageId: actionData.messageId,
              personId: actionData.personId,
              timestamp: new Date().toISOString()
            };
            
            const resetWebhookUrl = process.env.N8N_RESET_WEBHOOK_URL || N8N_WEBHOOK_URL;
            triggerN8nWorkflowWithUrl(resetData, resetWebhookUrl)
              .then(() => console.log("✅ n8n Reset workflow triggered successfully"))
              .catch((error) => console.error("❌ Failed to trigger n8n Reset workflow:", error.message));
          }
          
          // Check if it's an Apply Fix action
          if (actionData.inputs && actionData.inputs.action === "apply_fix") {
            console.log("🔧 Apply Recommended Fix action triggered!");
            console.log("📋 robotCode from card:", actionData.inputs.robotCode ? "present" : "missing");
            console.log("📋 jobfileId from card:", actionData.inputs.jobfileId);
            
            const fixData = {
              action: "apply_fix",
              testCase: actionData.inputs.testCase,
              analysis: actionData.inputs.analysis,
              jiraKey: actionData.inputs.jiraKey,
              robotCode: actionData.inputs.robotCode,
              jobfileId: actionData.inputs.jobfileId,
              projectId: actionData.inputs.projectId,
              testcaseId: actionData.inputs.testcaseId,
              roomId: actionData.roomId,
              messageId: actionData.messageId,
              personId: actionData.personId,
              timestamp: new Date().toISOString()
            };
            
            const fixWebhookUrl = process.env.N8N_FIX_WEBHOOK_URL || N8N_WEBHOOK_URL;
            triggerN8nWorkflowWithUrl(fixData, fixWebhookUrl)
              .then(() => console.log("✅ n8n Apply Fix workflow triggered successfully"))
              .catch((error) => console.error("❌ Failed to trigger n8n Apply Fix workflow:", error.message));
          }
        } catch (error) {
          console.error("Error parsing attachment action:", error);
        }
      });
    });
    
    apiReq.on('error', (error) => {
      console.error("Error fetching attachment action:", error);
    });
    
    apiReq.end();
  }
  
  next();
}, webhook(framework));

var server = app.listen(config.port, () => {
  framework.debug("framework listening on port %s", config.port);
});

// gracefully shutdown (ctrl-c)
process.on("SIGINT", () => {
  framework.debug("stopping...");
  server.close();
  framework.stop().then(() => {
    process.exit();
  });
});
