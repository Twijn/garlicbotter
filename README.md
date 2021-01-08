# Garlic Botter

Discord bot for ToastFPS Discord Server https://discord.gg/toastfps

## Commands

- !createsidecategory - Create a category to hold unused side channels. If you don't run this, it will simply keep the side channels where they are.
  - Usage: `!createsidecategory`
  - *(Ignores all arguments)*
- !role - Edit role variables, generally for use with granting moderators/adminstrators special permissions.
  - Usage: `!role <Role Mention> [Variable] [Value (side_history/side_view)]`
  - *Example: `!role @Moderator side_history true`*

## Auto Side Channels

By default, **all** channels will be auto-generated side channels when the voice channel is joined. This is even kept when all members leave the chat to allow for moderation on these channels. Other moderator tools can be added to roles via the `!role` command. If you have a side category set up with `!createsidecategory`, unused side chats will be pushed into a side category - this allows moderators, admins, and the server owner to keep the side chats tucked away when they're not used.

### Disabling Side Channel Generation

Currently, the only way to disable side channels are by **changing the name of the voice chat or the side chat.** As soon as the name is changed to `disallow`, the side chat will be changed, the voice channel will be renamed, and it will no longer generate side chats for this channel.

![Instructions for disallowing side channel generation](https://i.twijn.dev/01bQ.gif)

There are known issues where the bot sometimes can't change the channel name when disallowing. This is due to a lack of permissions, and can only be fixed by being granted permissions on that channel or being granted admin permissions. An easy fix to this is to change the name of the side channel instead.

### Allowing Side Channel Generation

Similarly to disabling side channels, the only way to reallow side channels are by changing the name of the voice chat. Change the name to `allow` and side chats will be generated again - note that the side channel will NOT be immediately generated, there will have to be a change in the voice state on that channel.

![Instructions for allowing side channel generation](https://i.twijn.dev/89V4.gif)

Similarly to disabling, there are known issues where the bot sometimes can't change the channel name when disallowing. This is due to a lack of permissions, and can only be fixed by being granted permissions on that channel or being granted admin permissions. An easy fix to this is to change the name of the side channel instead.

## Endless Channels

Endless channels allow you to only show a single voice channel for an event, game, etc. while allowing for full, automatic scalability. As soon as the channel is populated, a new channel will be made.

### Creation