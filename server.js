const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
const uuid = require('uuid');
const WS = require('ws');

const app = new Koa();


// => CORS
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

// => Body Parsers
app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

const router = new Router();
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

const instance = [];

router.get('/inst', async (ctx, next) => {
  console.log('get index');
  ctx.response.body = instance;
});

function sendMessage(id, itemMsg) {
  try {
    let msg = JSON.stringify({
      type: 'message',
      name: id,
      msg: itemMsg,
      dateTime: new Date(),
    });
    [...wsServer.clients][0].send(msg);
  } catch (e) {
    console.log(e);
  }
}

router.post('/inst', async (ctx, next) => {
  // create new contact
  console.log('add inst');
  const id = uuid.v4();
  // let msg = JSON.stringify({
  //   type: 'message',
  //   name: id,
  //   msg: 'Received "Create commaand"',
  //   dateTime: new Date(),
  // });
  // [...wsServer.clients][0].send(msg);

  sendMessage(id, 'Received "Create commaand"');

  setTimeout(() => {
    instance.push({
      id,
      state: 'stopped',
    });

  // msg server add
  // msg = JSON.stringify({
  //   type: 'message',
  //   name: id,
  //   msg: 'Created',
  //   dateTime: new Date(),
  // });
  // [...wsServer.clients][0].send(msg);
  sendMessage(id, 'Created');
  }, 5000);
  console.log('added');
  ctx.response.body = {
    status: 'ok'
  };
});

router.patch('/inst/:id', async (ctx, next) => {
  sendMessage(ctx.params.id, 'Received "Change State"');

  const index = instance.findIndex((item) => item.id === ctx.params.id);
  if (index !== -1) {
    setTimeout(() => {
      let curState = instance[index].state;
      curState = curState === 'stopped' ? 'started' : 'stopped';
      instance[index].state = curState;
      sendMessage(ctx.params.id, curState);
    }, 5000);
  };
  ctx.response.body = {
    status: 'ok'
  }
});

router.delete('/inst/:id', async (ctx, next) => {
  
  const index = instance.findIndex((item) => {
    return item.id === ctx.params.id;
  });
  console.log(index);
  if (index !== -1) {
    sendMessage(ctx.params.id, 'Received "Delete instace"');
    setTimeout(() => {
      instance.splice(index, 1);
      sendMessage(ctx.params.id, 'Deleted');
    }, 5000);
  };
  ctx.response.body = {
    status: 'ok'
  }
});

wsServer.on('connection', (ws, req) => {
  console.log('connection');
  ws.on('message', msg => {
    console.log('msg');
    [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(msg));
  });
  ws.on('close', msg => {
    console.log('close');
    [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({type: 'del user'})));
  });
  ws.on('change', msg => {
    console.log('change');
  });
  // new users
  [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({type: 'add user'})));
//  ws.send('welcome');
});

app.use(router.routes()).use(router.allowedMethods());
const port = process.env.PORT || 7070;
server.listen(port);
