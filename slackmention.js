'use latest';

const request = require('request');
const _ = require('lodash@4.8.2');

const baseURL = 'https://slack.com/api/';
const usersListEndpoint = 'users.list';
const imOpenEndpoint = 'im.open';
const chatPostEndpoint = 'chat.postMessage';
let token;

const callAPI = (endpoint, form, cb) => {
  request.post(baseURL + endpoint, { form }, (err, res, body) => {
    if (err) return cb(err);

    body = JSON.parse(body);
    if (!body.ok) return cb(body.error);

    return cb(null, body);
  });
};

const findUser = (username, cb) => {
  callAPI(usersListEndpoint, {token}, (err, body) => {
    if (err) return cb(err);

    const user = _.find(body.members, {name: username.toLowerCase()});

    if (!user) return cb(`User ${username} not found`);
    cb(null, user.id);
  });
};

const openIM = (user, cb) => {
  callAPI(imOpenEndpoint, {token, user}, (err, body) => {
    if (err) return cb(err);
    cb(null, body.channel.id);
  });
};

const postMsg = (channel, data, cb) => {
  const obj = {
    title: `#${data.id} | ${data.title}`,
    title_link: 'https://auth0.zendesk.com/agent/tickets/' + data.id,
    fields: [
      {title: 'Mentioned by', value: data.author},
      {title: 'Comment', value: data.comment},
      {title: 'Tags', value: data.tags}
    ]
  };
  callAPI(chatPostEndpoint, {
    token,
    channel,
    text: 'You were mentioned in this ticket:',
    attachments: JSON.stringify([obj])
  }, (err, body) => {
    if (err) return cb(err);
    cb(null);
  });
};

const extractName = (comment) => {
  const start = comment.indexOf('<@') + 2;
  const end = comment.substr(start).indexOf('>');
  return comment.substr(start, end);
};

module.exports = (context, cb) => {

  token = context.data.BOT_TOKEN;

  const name = extractName(context.data.comment);

  findUser(name, (err, id) => {
    if (err) { console.log(err); return cb(); }
    else openIM(id, (err, channelId) => {
      if (err) { console.log(err); return cb(); }
      else postMsg(channelId, context.data, cb);
    });
  });

};