#Class-Router
This is a pure JS router which uses JS classes for page navigation.

##How to install
```bash
    npm install class-router
```

##Usage
The router object is singleton.
Import from different modules always returns same object;

This example call create instance of class Main when you load the main page of application 

```javascript
    import router from '/node_modules/class-router/main.js'

    async function render() {
        //Render page content here 
    }   
    
    class Main {
        constructor(mount, route) {
            this._mount = mount;
            this._route = route; //Will be a matched route object from routeTable
            render(this);
        }
        
        unmount() {
            //Fires when before the new route called
            //Do all cleanup here 
        }       
    }

    const routeTable = [
        { name: 'home', path: '/', constructor: Main }
    ];

    //Mount router to some id. The routed classes will be able to insert
    //content into router mount point   
    router.mount = this._mount.querySelector('#Router');
    
    //Assign routeTable to router routes.
    //After this point the router will start routing objects depends on location path
    router.routes = routeTable;
```

