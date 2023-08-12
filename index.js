import {
  VK,
  Keyboard,
  API,
} from 'vk-io';

import {
  HearManager
} from '@vk-io/hear';

const TOKEN = ''
const whtieList = [305489985, 230362993] // Список разрешенных пользователей 

const vk = new VK({
  token: TOKEN
});

const api = new API({
  token: TOKEN
});

const bot = new HearManager();

const keyboard = Keyboard.builder().callbackButton({ // Кнопка записаться
  label: 'Записаться',
  payload: {
    command: 'add_id'
  },
}).inline();

vk.updates.on('message_new', bot.middleware);

vk.updates.start().catch(console.error);


async function getUserString(userId) { // Функция для получения имени пользователя
  const users = await api.call('users.get', { //достает имя через Id
    user_ids: userId
  });
  const user = users[0];
  const userName = user.first_name + ' ' + user.last_name;
  const userString = `[id${userId}|${userName}]`;
  return userString;
};


bot.hear(/^q start (.+)/, async (context) => { // Вызов начала очереди
  if (!whtieList.includes(context.senderId)) {
    await context.send('Пососи');
    return;
  }
  const messageAfterCommand = context.$match[1] + '\n';
  await context.send(messageAfterCommand, {
    keyboard: keyboard
  });
});

bot.hear(/^q help$/, async (context) => { // Помощь
  await context.send('Создать очередь: q start "название очереди"\n Тык добавляет в очередь \n Повторный тык удаляет из очереди');
});


vk.updates.on('message_event', async (context) => {
  const userId = context.userId;
  const messageId = context.conversationMessageId;
  const peerId = context.peerId;

  const oldMessage = await api.messages.getByConversationMessageId({
    peer_id: peerId,
    conversation_message_ids: messageId,
  });

  const oldText = oldMessage.items[0].text;
  const userString = await getUserString(userId);

  if (oldText.includes(userString)) {
    await api.messages.edit({
      peer_id: peerId,
      conversation_message_id: messageId,
      message: oldText.replace('\n' + userString, ''),
      keyboard: keyboard,
    });
    return;
  } else {
    await api.messages.edit({
      peer_id: peerId,
      conversation_message_id: messageId,
      message: oldText + '\n' + userString + '\n',
      keyboard: keyboard,
    });
  }
});