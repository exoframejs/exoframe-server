FROM node:onbuild

RUN npm run build

CMD ["node", "dist/index.js"]
