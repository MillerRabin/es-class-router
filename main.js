import messages from '/node_modules/browser-messages/main.js';
import safe from "/node_modules/safe-ops/main.js";

function onChangeRoute(callback) {
    messages.on('router.change', callback)
}

function offChangeRoute(callback) {
    messages.off('router.change', callback)
}

function splitPath(path) {
    const pathItems = path.split('/');
    const res = [];
    for (let item of pathItems) {
        const iarr = item.split(':');
        const rItem = { path: item };
        if (iarr.length == 1) {
            rItem.reg = item;
            res.push(rItem);
            continue;
        }
        rItem.paramName = iarr[1];
        rItem.reg = '(.+)';
        res.push(rItem);
    }
    return res;
}

function getRelativePath(href) {
    const origin = window.location.origin;
    const larr = href.split(origin);
    if (larr.length > 1)
        return larr[1];
    return href;
}

function buildPath(pathItems) {
    const reg = [];
    const params = [];

    for (let item of pathItems) {
        reg.push(item.reg);
        if (item.paramName == null) continue;
        params.push(item.paramName);
    }
    const regStr = reg.join('/');
    return {
        reg: safe.regExp(regStr, 'i'),
        params: params
    }
}

function createRegPath(path) {
    const pathItems = splitPath(path);
    return buildPath(pathItems);
}

function pathToReg(routes) {
    for (let route of routes)
        route.pathReg = createRegPath(route.path);
}

function matchParameters(route, path) {
    const pathReg = route.pathReg;
    const match = pathReg.reg.exec(path);
    if (match == null) return null;
    const tRoute = Object.assign({ params: [] }, route);
    tRoute.link = path;
    for (let i = 0; i < pathReg.params.length; i++) {
        const rObj = {};
        const name = pathReg.params[i];
        rObj[name] = match[i + 1];
        tRoute.params.push(rObj);
    }
    return tRoute;
}

function matchRoute(routes, path) {
    const relPath = getRelativePath(path);
    const candidates = [];
    for (let route of routes) {
        const match = matchParameters(route, relPath);
        if (match != null) candidates.push(match);
    }
    if (candidates.length == 0) return null;
    candidates.sort((a, b) => {
        if (a.path < b.path) return 1;
        if (a.path > b.path) return -1;
        return 0;
    });
    return candidates[0];
}

function pushState(route) {
    window.history.pushState({ link: route.link }, route.name, route.link);
}

function back() {
    return window.history.back();
}

function changeRoute(event) {
    const route = applyRoute(gRouter, event.target.href);
    pushState(route);
    return false;
}

window.onpopstate = async function (event) {
    const state = event.state;
    const link = ((state == null) || (state.link == null)) ? window.location.href : state.link;
    applyRoute(gRouter.routes, link);
};

function buildLink(route) {
    const npaths = [];
    const paths = route.path.split('/');
    for (let path of paths) {
        const [,vname] = path.split(':');
        if (vname == null) {
            npaths.push(path);
            continue;
        }
        const par = (route.params[vname] != null) ? route.params[vname] : path;
        npaths.push(par);
    }
    return npaths.join('/');
}

function changeState(router, routeParams) {
    let route = null;
    if (routeParams.name != null) {
        route = routes.find(r => r.name == routeParams.name);
        if (route == null) return null;
        const tRoute = Object.assign({ params: routeParams.params }, route);
        if ((routeParams.params == null) || !routeParams.params.noMount)
            setNewRoute(router, tRoute);
        tRoute.link = buildLink(tRoute);
        pushState(tRoute);
        return tRoute;
    }

    if (routeParams.path != null) {
        const route = matchRoute(routes, routeParams.path);
        setNewRoute(route);
        const tRoute = Object.assign({ params: routeParams.params, path: routeParams.path }, (route == null) ? {} : route) ;
        tRoute.link = buildLink(tRoute);
        pushState(tRoute);
        return tRoute;
    }

    return null;
}

function setNewRoute(router, route) {
    if ((router.activeComponent != null) && (router.activeComponent.unmount != null))
        router.activeComponent.unmount();

    router.activeRoute = route;
    if (route != null) {
        if (route.redirect != null) {
            window.location.replace(route.redirect.path);
            return;
        }
        router.activeComponent = new route.Constructor(router.mount, route);
    }
    messages.send('router.change', { router: router, route });
    return true;
}

function applyRoute(router, path) {
    const route = matchRoute(router.routes, path);
    setNewRoute(router, route);
    return route;
}

class Router {
    constructor() {
        this._routes = null;
        this._mount = null;
        this.activeRoute = null;
        this.activeComponent = null;
        this.on = {
            change: onChangeRoute
        };
        this.off = {
            change: offChangeRoute
        };
    }

    apply(href) {
        applyRoute(this, href);
    }

    push(route) {
        changeState(this, route);
    }

    back() {
        back(this);
    }

    get mount() {
        return this._mount;
    }

    set mount(value) {
        this._mount = value;
    }

    get routes() {
        return this._routes;
    }

    set routes(value) {
        this._routes = value;
        pathToReg(this._routes);
        this.apply(window.location.href);
    }
}

class RouteLink extends HTMLAnchorElement {
    connectedCallback() {
        this.classList.add('route-link');
        this.onclick = changeRoute;
    }
}

customElements.define('route-link', RouteLink, { extends: 'a' });

const gRouter = new Router();

export default gRouter;
