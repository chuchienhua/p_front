import axios from 'axios';

export const generateAPIUrl = (apiName) => {
    const hostname = window.location.hostname
    if (hostname === 'tpiot.ccpgp.com') {
        const baseUrl = 'https://ai_02.ccpgp.com'
        return baseUrl + '/pbtc-schedule' + apiName;
    } else {
        return '/pbtc-schedule' + apiName;
    }
}


//從LocalStorage取出persist，如果要改寫，可以參考 index.js:16
export const parsePersistFromLocalStorage = () => {
    let persist = localStorage.getItem('persist:root');
    let obj = null;
    if (persist) {
        obj = JSON.parse(persist);
        if (obj) {
            for (let key in obj) {
                obj[key] = JSON.parse(obj[key]);
            }
        }
    }
    return obj;
}

//從localStorage中取出PPS_CODE
export const getPPS_CODE = () => {
    let obj = parsePersistFromLocalStorage();
    let pps_code = null;
    if (obj) {
        let user = obj.user;
        if (user && user.data) {
            pps_code = user.data.PPS_CODE;
        }
    }

    return pps_code;
}

//從localStorage中取出PPS_NAME
export const getPPS_NAME = () => {
    let obj = parsePersistFromLocalStorage();
    let name = null;
    if (obj) {
        let user = obj.user;
        if (user && user.data) {
            if (user.data.NAME) {
                name = user.data.NAME;
            } else {
                name = user.data.PPS_CODE;
            }
        }
    }

    return name;
}

//從localStorage中取出token
export const getTokenFromPersist = () => {
    let obj = parsePersistFromLocalStorage();
    if (obj) {
        let user = obj.user;
        if (user.token) {
            return user.token;
        }
    }

    return null;
}


export const customHash = (obj) => {
    let hash = 0;

    if (typeof obj === 'object') {
        const jsonStr = JSON.stringify(obj);

        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr.charCodeAt(i);
            hash = (hash << 5) - hash + char;
        }
    }

    return hash.toString(36);
}

export const itraceAxiosConfig = {
    transformRequest: axios.defaults.transformRequest.concat((data, headers) => {
        headers['Authorization'] = `JWT ${getTokenFromPersist()}`;

        return data;
    }),
};


