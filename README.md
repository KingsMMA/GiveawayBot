# Giveaway Bot
###### A commission developed by KingsDev

![Creating a giveaway with a role_requirement](https://github.com/user-attachments/assets/d2cbc082-d7e7-4b6d-9e38-169990a14283)
###### To see more of my work, including more screenshots, go to https://kingrabbit.dev/

Giveaway Bot allows server staff to create and run giveaways for their community.  The bot allows users to enter or leave the giveaways by clicking a button on the messages.  When creating a giveaway, staff can set a prize, duration, number of winners, a message, and optionally a role requirement.  The bot uses a MongoDB database to ensure all giveaways persist after restart - if a giveaway ends while the bot is down, it will be automatically ended when the bot next starts and only entries from before the giveaway ended will be counted.  Server staff can setup and reroll giveaways through the `/giveaway` command.

## Commands
`<>` required parameter  
`[]` optional parameter

### `/giveaway`
This is the command used by staff members to manage the giveaways
- #### `/giveaway start <prize> <duration> <winners> [channel] [role] [message]`
  This command allows staff to create a giveaway.  Duration is given in `1d 2h 3m 4s` format.  If no channel is specified, the giveaway will be sent in the current channel.  The `role` parameter refers to an optional role requirement to enter the giveaway.
- #### `/giveaway reroll <message_url> [winners]`
  This command allows staff to reroll a giveaway.  If no amount of winners is provided, only one winner will be rerolled.

## Running the bot
The bot is built using Node.js 20.  To run the bot, install the required dependencies with `npm i` and then run the bot with `npm run start`.  
The bot requires environment variables to be set (optionally through the creation of a `.env` file):
- `BOT_ID` - The bot's user ID.
- `BOT_TOKEN` - The bot token.
- `MONGO_URI` - The MongoDB URI the bot should connect to.  This database will be used to store the giveaways.
