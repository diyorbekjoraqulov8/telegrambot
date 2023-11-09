const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
let addressAll = [];
const axios = require('axios')

const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });

// bot.setWebHook();

let currentAddress;

let currentPage = 1;
let pageLimit = 12;
let addressLength;

const api = process.env.ADDRESS_API;

async function getApi(api) {
  try {
    let res = await axios.get(api)
  
    addressLength = res?.data?.length
    addressAll = res?.data
    console.log("addressAll: ", addressAll);
  } catch (err) {
    console.log(err);
  }
}
getApi(api)

async function page(api, page, limit) {
  try {
    let res = await axios.get(`${api}?page=${page}&limit=${limit}`)

    let currentPost = res?.data || []

    let link;

    if (page === 1) {
      link = [
        {
          text: '⏩',
          callback_data: 'right'
        }
      ]
    } else if (page === Math.ceil(addressLength / limit)) {
      link = [
        {
          text: '⏪',
          callback_data: 'left'
        }
      ]
    } else {
      link = [
        {
          text: '⏪',
          callback_data: 'left'
        },
        {
          text: '⏩',
          callback_data: 'right'
        }
      ]
    }

    currentPost.push(link)

    return currentPost
  } catch (err) {
    console.log(err)
  }
}

let qishloqlar;
currentAddress = page(api, currentPage, pageLimit)
currentAddress.then(res => {
  qishloqlar = dubbleArray(res);
})

let mainMsg = `O'z mahallangizni tanlang! 😊`;

// currentIndex / currentPage

function dubbleArray(arg = []) {
  return arg.map((item,i) => {
    if (arg.length - 1 > i) {
      return [
        item
      ]
    } else {
      return item
    }
  })
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText === '/start') {
    currentPage = 1;
    const keyboard = {
      inline_keyboard: qishloqlar
    };

    const options = {
      reply_markup: JSON.stringify(keyboard)
    };

    bot.sendMessage(chatId, mainMsg, options);
  } else {
    // Handle other messages here.
  }
});

let prevPage = 1;
let prevData = 0;
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  let newKeyboard;

  console.log("data: ", data);

  if (data === 'right' || data === 'left') {
    if (data === 'right') {
      let page = currentPage + 1
      currentPage = currentPage <= Math.ceil(addressLength / pageLimit) ? page : currentPage
    } else {
      let page = currentPage - 1
      currentPage = page >= 1 ? page : 1
    }

    let address = await page(api, currentPage, pageLimit)
    newKeyboard = {
      inline_keyboard: dubbleArray(address)
    };
  } else if (data === "back") {
    let address = await page(api, currentPage, pageLimit)
    newKeyboard = {
      inline_keyboard: dubbleArray(address)
    };
  } else {
    newKeyboard = {
      inline_keyboard: [
        [
          {
            text: 'Orqaga', 
            callback_data: "back"
          }
        ]
      ]
    };
  }

  let options = {
    reply_markup: JSON.stringify(newKeyboard)
  };

  if (data === 'right' || data === 'left') {
    if (prevPage !== currentPage) {
      bot.editMessageText(mainMsg, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: options.reply_markup
      });
    }
  } else if (data === 'back') {
    if (prevData !== data) {
      bot.editMessageText(mainMsg, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: options.reply_markup
      });
    }
    prevData = data
  }
  else {
    if (data !== prevData) {
      let res = await axios.get(`${api}/${data}`)

      let msg = `${res?.data?.text} mahallasining telegram kanali: \n\n Kanalga o'tish!\n(${res?.data?.link})`
      bot.editMessageText(msg, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: options.reply_markup
      });
    }
    prevData = data
  }

  prevPage = currentPage
});