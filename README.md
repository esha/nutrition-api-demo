First, install NodeJS. It comes with NPM. Also, it might be easier to install with NVM to manage multiple versions.
Then run these commands:
```
git clone git@github.com:esha/wsdemo.git
cd wsdemo
npm install
cd dist
npx nf start -p 8000
```

Then direct your browser to ```http://localhost:8000/```

To change the project, edit the html/css/js files in /app.
Whenever you make a change, rebuild and restart by doing:
```cd .. && grunt && cd dist && npx nf start -p 8000```

To deploy the app to Heroku, follow these instructions.
Create your own Heroku app with:  
```heroku apps:create myappname```
Set your APIKEY:
```heroku config:set APIKEY=myapikey```
Deploy the app:  
```git subtree push --prefix dist heroku master```
For later updates, force the subtree push:
```git push heroku `git subtree split --prefix dist master`:master --force```
