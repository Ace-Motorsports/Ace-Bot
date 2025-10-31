# Ace-Bot

Ace Motorsports iRacing Discord bot

## Features

Ace-Bot is designed to integrate your iRacing and Discord experience seamlessly. Here are some of the key features:

*   **iRacing License Roles:** Automatically assign Discord roles to users based on their iRacing license class. This helps you easily identify drivers of different skill levels in your server.
*   **Dynamic Nicknames:** The bot can update user nicknames to match their iRacing names, ensuring consistency and easy identification.
*   **Temporary Voice Channels:** Users can create temporary voice channels, which are automatically deleted when empty, keeping your voice channel list clean and organized.
*   **iRacing Account Linking:** Securely link your iRacing account to your Discord profile to enable the features above.

## Inviting the Bot to Your Server

To add Ace-Bot to your Discord server, you will need to use its OAuth2 URL.

**Required Permissions:**

When you invite the bot, ensure that the following permissions are granted for it to function correctly:

*   Connect
*   Manage Channels
*   Manage Nicknames
*   Manage Roles
*   Move Members
*   Send Messages
*   Use Slash Commands
*   Use Voice Activity
*   View Channels

## Required Server Setup

For the license-based role-management features to work, you must create the following roles in your Discord server:

*   **Rookie**
*   **Class-D**
*   **Class-C**
*   **Class-B**
*   **Class-A**

**Important:** The bot's role must be higher than these license roles in your server's role hierarchy for it to be able to assign them to users.

## Slash Commands

Ace-Bot uses slash commands for all of its features. Here are the available commands:

*   `/link`: Link your iRacing account to your Discord account.
*   `/unlink`: Unlink your iRacing account from your Discord account.
