module.exports = ({hasYarn}) =>
  `FROM node:alpine

# create folder and set it as workdir
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy package and yarn files to cache deps install
COPY package.json /usr/src/app/${hasYarn
    ? `
COPY yarn.lock /usr/src/app/
RUN yarn`
    : 'RUN npm install --silent'}

# copy app itself
COPY . /usr/src/app

EXPOSE 80

CMD ["yarn", "start"]
`;
