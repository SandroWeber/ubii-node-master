# ubii-nodejs-backend

## Project setup


### Windows pre-requisists before "npm install"

#### windows build tools

from admin shell:
```
npm install -g windows-build-tools
```

if it complains about not being able to find v140 of build tools, try
```
npm install --vs2015 -g windows-build-tools
```

also see: https://www.npmjs.com/package/zeromq

#### CMake

install from https://cmake.org/download/

### install dependencies

```
npm install
```

### run with default config
```
npm start