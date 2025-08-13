# Ace-Bot

Ace Motorsports iRacing Discord bot

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Ace-Motorsports/Ace-Bot.git
cd Ace-Bot
```

### 2. Prepare Configuration

Copy the sample configuration file:

```bash
cp samples/config.json config/config.json
```

#### Editing `config/config.json`

Open `config/config.json` in your editor and provide the following parameters:

| Parameter         | Description                                                                                   | How to Obtain/Set                                                                 |
|-------------------|-----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| `discord_token`   | Discord bot token.                                                                            | [Discord Developer Portal](https://discord.com/developers/applications) → Create app → Add bot → Copy token. |
| `clientId`        | Discord application client ID.                                                                | Found in your Discord application settings.                                       |
| `channelId`       | Discord channel ID used as the parent for temporary voice channels (discord-temp-channels).   | Right-click your Discord voice channel → "Copy ID" (enable Developer Mode in Discord).  |
| `categoryId`      | Discord category ID where temporary voice channels will be created (discord-temp-channels).   | Right-click your Discord category → "Copy ID".                                    |
| `iracingUser`     | Your iRacing account username/email.                                                          | Use your iRacing login email or username.                                         |
| `iracingPassword` | Your iRacing account password.                                                                | Use your iRacing password.                                                        |
| `guildId`         | Discord server (guild) ID where the bot will operate.                                         | Right-click your Discord server → "Copy ID".                                      |

**Important:**  
You must enable **legacy authentication** for your iRacing account to allow the bot to read the iRacing data API.  
Follow the instructions here: [Enabling or Disabling Legacy Read-Only Authentication](https://support.iracing.com/support/solutions/articles/31000173894-enabling-or-disabling-legacy-read-only-authentication)

**Example:**
```json
{
  "discord_token": "YOUR_DISCORD_BOT_TOKEN",
  "clientId": "YOUR_DISCORD_CLIENT_ID",
  "channelId": "YOUR_DISCORD_CHANNEL_ID",
  "categoryId": "YOUR_DISCORD_CATEGORY_ID",
  "iracingUser": "YOUR_IRACING_USERNAME_OR_EMAIL",
  "iracingPassword": "YOUR_IRACING_PASSWORD",
  "guildId": "YOUR_DISCORD_GUILD_ID"
}
```

### 3. Set Up Discord Role Names

Before running the bot, you must create the following roles in your Discord server. These roles are used to assign iRacing license classes to users:

- **Rookie**
- **Class-D**
- **Class-C**
- **Class-B**
- **Class-A**

**How to create roles:**
1. Go to your Discord server settings.
2. Click "Roles" in the sidebar.
3. Click "Create Role" and set the name to one of the above (e.g., `Rookie`).
4. Repeat for each role: `Class-D`, `Class-C`, `Class-B`, `Class-A`.
5. Optionally, set colors and permissions as needed.
6. **Important:** Make sure the bot's role is above these roles in the role hierarchy so it can assign them.  
   The bot can only change the nicknames and roles of users whose roles are lower than the bot's own role in the hierarchy.

### 4. Bot Permissions in Discord Developer Portal

When setting up your bot in the [Discord Developer Portal](https://discord.com/developers/applications), set the following **scopes** and **permissions** as shown in the screenshot:

**Scopes:**
- `applications.commands`
- `bot`

**Permissions:**
- Connect
- Manage Channels
- Manage Nicknames
- Manage Roles
- Move Members
- Send Messages
- Use Slash Commands
- Use Voice Activity
- View Channels

These permissions are required for the bot to function correctly.  
When generating the OAuth2 URL for inviting your bot, select only these permissions.

### 5. Build and Run with Docker

#### Option 1: Using Docker Compose

Create a `docker-compose.yaml` file in your project directory:

```yaml
version: "2"
services:
  ace-bot:
    image: node:latest
    working_dir: /home/node/app
    environment:
      - NODE_ENV=production
    volumes:
      - ./Ace-Bot:/home/node/app
    ports:
      - "8001:8001"
    command: "npm start"
```

Start the container:

```bash
docker-compose up -d
```

#### Option 2: Using Docker CLI

Build a custom image (optional):

```bash
docker build -t ace-bot .
```

Run the container:

```bash
docker run -d \
  --name ace-bot \
  -v $(pwd):/home/node/app \
  -w /home/node/app \
  -e NODE_ENV=production \
  -p 8001:8001 \
  node:latest npm start
```

### 6. Managing the Bot

- To view logs:  
  ```bash
  docker-compose logs ace-bot
  # or
  docker logs ace-bot
  ```
- To stop the bot:  
  ```bash
  docker-compose down
  # or
  docker stop ace-bot
  ```

---

## Notes

- Keep your bot token and credentials secure.
- Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode) to copy IDs.
- For more details on Discord bot setup, see the [Discord Developer Portal documentation](https://discord.com/developers/docs/intro).
- If you update `config/config.json`, restart the container to apply changes.
