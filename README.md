# Ace Bot

A Discord.js bot for iRacing Ace Motorsports.

## Features

*   **iRacing Account Linking:** Link your Discord account to your iRacing account to get a server nickname that reflects your iRacing license and iRating.
*   **Automatic Nickname Updates:** Nicknames are automatically updated every 30 minutes to ensure they are always up-to-date with your latest iRacing stats.
*   **Dynamic Race Rooms:** Automatically creates temporary voice channels when a user joins a designated lobby channel. These rooms are numbered sequentially and are automatically deleted when they are empty.
*   **Admin Configuration:** Server admins can use slash commands to configure the bot for their server.

## Getting Started

1.  **Invite the Bot:** Invite the bot to your Discord server using this link: `https://discord.com/oauth2/authorize?client_id=1433716689723326486`
2.  **Configuration:** Once the bot is in your server, an admin can use the following commands to set it up:
    *   `/set-temp-channel <channel>`: Sets the voice channel that users can join to create a temporary race room.
    *   `/set-temp-category <category>`: Sets the category where the new temporary race rooms will be created.

## User Commands

*   `/link <iracing_id>`: Links your Discord account to your iRacing account. Your iRacing ID is the number found in the top right of your iRacing profile.
*   `/unlink`: Unlinks your Discord account from your iRacing account.
*   `/togglenick`: Toggles your server nickname between your iRacing stats and your original Discord username.
