import {
  VK,
  Keyboard,
  API,
} from 'vk-io';

import {
  HearManager
} from '@vk-io/hear';

import fs from 'fs';

const TOKEN = ''; // Токен группы

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

async function fileToArray() { // Функция для получения массива из файла
  const content = await fs.readFileSync('whitelist.txt', 'utf-8');
  const lines = content.split('\n');
  return lines.filter(line => line.trim() !== '');
}

async function removeValueFromFile(filename, valueToRemove) { // Функция для удаления значения из файла
  const content = await fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n');
  const updatedLines = lines.filter(line => line !== valueToRemove);
  fs.writeFileSync(filename, updatedLines.join('\n'), 'utf-8');
}

async function addValueToFile(filename, value) { // Функция для добавления значения в файл
  await fs.appendFileSync(filename, value + '\n', 'utf-8');
}

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
  const whitelist = await fileToArray();
  const userId = context.senderId;
  if (!whitelist.includes(userId.toString())) {
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

vk.updates.on('message_event', async (context) => { // Обработка нажатия кнопки
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

bot.hear(/^q add w (.+)/, async (context) => { // Добавление в белый список
  const userId = context.$match[1];
  const whitelist = await fileToArray();
  if (whitelist.includes(userId.toString())) {
    context.send('Пользователь уже в белом списке');
    return;
  }
  await addValueToFile('whitelist.txt', userId);
  context.send('Пользователь добавлен в белый список');
});

bot.hear(/^q del w (.+)/, async (context) => { // Удаление из белого списка
  const userId = context.$match[1];
  await removeValueFromFile('whitelist.txt', userId);
  context.send('Пользователь удален из белого списка');
});

bot.hear(/^q list w$/, async (context) => { // Удаление из белого списка
  const whitelist = await fileToArray();
  let message = 'Список пользователей в белом списке:\n';
  for (let i = 0; i < whitelist.length; i++) {
    const userString = await getUserString(parseInt(whitelist[i]));
    message += userString + '\n';
  };
  await context.send(message);
});