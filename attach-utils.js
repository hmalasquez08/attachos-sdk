(function () {
  // Configuración inicial (puedes cambiar debug a true para ver los logs en consola)
  const debug = false;
  const brandName = 'AttachOs - SDK';

  const charLimit = 500;
  const maxDepth = 10;
  const maxArrayLength = 50;
  const hashCacheMaxSize = 500;
  const payloadSizeLimit = 50000;
  const dedupWindow = 2000;

  // Helpers de GTM convertidos a Vanilla JS
  const getType = (v) => {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  };

  const getTimestampMillis = () => Date.now();

  const dataLayerPush = (payload) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  };

  const sha256 = (str, onSuccess, onFailure) => {
    if (!window.crypto || !window.crypto.subtle) {
      if (onFailure) onFailure('Web Crypto API no disponible');
      return;
    }
    const buffer = new TextEncoder().encode(str);
    window.crypto.subtle
      .digest('SHA-256', buffer)
      .then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        if (onSuccess) onSuccess(hashHex);
      })
      .catch((err) => {
        if (onFailure) onFailure(err);
      });
  };

  // Lógica principal
  const makeLookup = (arr) => {
    const obj = {};
    for (let i = 0; i < arr.length; i++) obj[arr[i]] = true;
    return obj;
  };

  const stringKeys = makeLookup([
    'id',
    'item_id',
    'transaction_id',
    'sku',
    'ref',
    'postal_code',
    'zip',
    'coupon',
    'affiliation',
    'content_ids',
    'contents',
  ]);
  const upperKeys = makeLookup(['currency']);
  const sensitiveKeys = makeLookup([
    'email',
    'phone',
    'telefono',
    'celular',
    'mobile',
    'tel',
  ]);
  const phoneKeys = makeLookup([
    'phone',
    'telefono',
    'celular',
    'mobile',
    'tel',
  ]);

  const safeChars = makeLookup([
    ' ',
    '.',
    ',',
    '-',
    '_',
    '(',
    ')',
    '/',
    '%',
    '&',
    "'",
    '"',
    ':',
    '+',
    '@',
  ]);

  const hashCache = {};
  const hashCacheKeys = [];
  const dedupCache = {};

  const util = {
    log: (msg, payload) => {
      if (!debug) return;
      console.log(brandName + ' [' + msg + ']', payload || '');
    },

    toPascalCase: (str) => {
      if (!str) return '';
      let result = '';
      let capitalizeNext = true;
      let chars = str.trim().toLowerCase();
      for (let i = 0; i < chars.length; i++) {
        let c = chars[i];
        let isAlphaNum = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
        let isDelimiter = c === ' ' || c === '-' || c === '_';
        if (isAlphaNum) {
          if (capitalizeNext) {
            result += c.toUpperCase();
            capitalizeNext = false;
          } else {
            result += c;
          }
        } else if (isDelimiter) {
          capitalizeNext = true;
        }
      }
      return result;
    },

    toSnakeCase: (str) => {
      if (!str) return '';
      let acc = 'àáâãäåòóôõöøèéêëðçìíîïùúûüñšÿýž';
      let non = 'aaaaaaooooooeeeeeciiiiuuuunsyyz';

      let out = str.toLowerCase().trim();
      let res = '';
      let lastWasUnderscore = false;

      for (let i = 0; i < out.length; i++) {
        let c = out[i];
        let idx = acc.indexOf(c);
        if (idx !== -1) c = non[idx];
        let isAlphaNum = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
        let isSpaceOrDash = c === ' ' || c === '-';
        if (isAlphaNum) {
          res += c;
          lastWasUnderscore = false;
        } else if (isSpaceOrDash || c === '_') {
          if (!lastWasUnderscore && res.length > 0) {
            res += '_';
            lastWasUnderscore = true;
          }
        }
      }
      if (res.length > 0 && res[res.length - 1] === '_') {
        res = res.substring(0, res.length - 1);
      }
      return res;
    },

    smartParse: (s) => {
      if (getType(s) !== 'string') return s;
      let t = s.trim();
      if (t === '') return s;

      for (let i = 0; i < t.length; i++) {
        let c = t[i];
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) return s;
      }

      let stripped = '';
      for (let i = 0; i < t.length; i++) {
        let c = t[i];
        if ((c >= '0' && c <= '9') || c === '.' || c === ',') stripped += c;
      }

      if (stripped.length === 0) return s;
      if (stripped !== t) t = stripped;

      let clean = t.split(',').join('');
      if (clean.length > 1 && clean[0] === '0' && clean[1] !== '.') return s;

      let n = clean * 1;
      if (n !== n) return s;

      return ((n * 100) | 0) / 100;
    },

    normalizeVal: (t, n) => {
      if (getType(t) !== 'string') return t;
      let key = n ? n.toLowerCase() : '';
      let val = t.trim();

      if (upperKeys[key]) val = val.toUpperCase();
      else if (!stringKeys[key]) val = val.toLowerCase();

      let acc = 'àáâãäåòóôõöøèéêëðçìíîïùúûüñšÿýž';
      let non = 'aaaaaaooooooeeeeeciiiiuuuunsyyz';
      let deaccented = '';
      for (let i = 0; i < val.length; i++) {
        let c = val[i];
        let idx = acc.indexOf(c);
        if (idx !== -1) c = non[idx];
        deaccented += c;
      }
      val = deaccented;

      let safe = '';
      for (let i = 0; i < val.length; i++) {
        let c = val[i];
        let isLetter = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
        let isDigit = c >= '0' && c <= '9';
        if (isLetter || isDigit || safeChars[c]) safe += c;
      }
      val = safe.trim();

      let words = val.split(' ');
      let cleanArr = [];
      for (let i = 0; i < words.length; i++) {
        if (words[i] !== '') cleanArr.push(words[i]);
      }
      val = cleanArr.join(' ');

      if (val.length === 0) return null;

      if (val.length > charLimit) {
        util.log(
          'charLimit excedido, truncando key: ' +
            (n || 'desconocido') +
            ' (' +
            val.length +
            ' chars)',
        );
        val = val.substring(0, charLimit);
      }
      return val;
    },

    normalizePhone: (val) => {
      if (!val || getType(val) !== 'string') return null;
      let digits = '';
      for (let i = 0; i < val.length; i++) {
        if (val[i] >= '0' && val[i] <= '9') digits += val[i];
      }
      return digits.length > 0 ? digits : null;
    },

    hashSensitive: (val, isPhone, callback) => {
      if (!val || getType(val) !== 'string') {
        callback(null);
        return;
      }
      let normalized;
      if (isPhone) {
        normalized = util.normalizePhone(val);
        if (!normalized) {
          callback(null);
          return;
        }
      } else {
        normalized = val.trim().toLowerCase();
      }

      if (hashCache[normalized]) {
        callback(hashCache[normalized]);
        return;
      }

      sha256(
        normalized,
        (result) => {
          if (hashCacheKeys.length >= hashCacheMaxSize) {
            const oldestKey = hashCacheKeys.shift();
            hashCache[oldestKey] = undefined;
          }
          hashCache[normalized] = result;
          hashCacheKeys.push(normalized);
          callback(result);
        },
        (err) => {
          util.log('sha256 error: ' + err);
          callback(null);
        },
      );
    },

    cleanSync: (t, n, depth, visited) => {
      depth = depth || 0;
      if (depth >= maxDepth) {
        util.log(
          'maxDepth alcanzado, valor descartado en key: ' + (n || 'raíz'),
        );
        return null;
      }

      if (t === null || t === undefined || t === '') return null;
      if (getType(t) === 'number' && t === 0) return null;

      let type = getType(t);
      if (type === 'function' || type === 'symbol') return null;

      if (type === 'array' && t.length === 0) return null;
      if (type === 'object') {
        let hasKeys = false;
        for (let k in t) {
          hasKeys = true;
          break;
        }
        if (!hasKeys) return null;
      }

      visited = visited || [];
      if (type === 'object' || type === 'array') {
        for (let i = 0; i < visited.length; i++) {
          if (visited[i] === t) return null;
        }
        visited.push(t);
      }

      let key = n ? n.toLowerCase() : '';

      if (sensitiveKeys[key]) {
        let prefix = phoneKeys[key] ? '__sensitive_phone__:' : '__sensitive__:';
        return prefix + t;
      }

      if (stringKeys[key])
        return type === 'string' ? util.normalizeVal(t, n) : t;
      if (key.indexOf('id') !== -1)
        return type === 'string' ? util.normalizeVal(t, n) : t;

      let parsed = util.smartParse(t);
      if (getType(parsed) === 'number') return parsed;

      if (type === 'array') {
        let arrRes = [];
        for (let i = 0; i < t.length && i < maxArrayLength; i++) {
          let cv = util.cleanSync(t[i], null, depth + 1, visited);
          if (cv !== null && cv !== undefined) arrRes.push(cv);
        }
        return arrRes.length > 0 ? arrRes : null;
      }

      if (type === 'object') {
        let objRes = {};
        for (let k in t) {
          let cleanKey = util.toSnakeCase(k);
          let cv = util.cleanSync(t[k], cleanKey, depth + 1, visited);
          if (cv !== null && cv !== undefined) {
            objRes[cleanKey] = cv;
          } else {
            util.log('Campo descartado por clean: ' + cleanKey);
          }
        }
        let hasKeys = false;
        for (let k in objRes) {
          hasKeys = true;
          break;
        }
        return hasKeys ? objRes : null;
      }

      return type === 'string' ? util.normalizeVal(t, n) : t;
    },

    findSensitiveKeys: (obj, result) => {
      result = result || [];
      let type = getType(obj);
      if (type === 'object') {
        for (let k in obj) {
          let val = obj[k];
          if (
            getType(val) === 'string' &&
            (val.indexOf('__sensitive__:') === 0 ||
              val.indexOf('__sensitive_phone__:') === 0)
          ) {
            result.push({parent: obj, key: k});
          } else if (getType(val) === 'object' || getType(val) === 'array') {
            util.findSensitiveKeys(val, result);
          }
        }
      } else if (type === 'array') {
        for (let i = 0; i < obj.length; i++) {
          let val = obj[i];
          if (
            getType(val) === 'string' &&
            (val.indexOf('__sensitive__:') === 0 ||
              val.indexOf('__sensitive_phone__:') === 0)
          ) {
            result.push({parent: obj, key: i});
          } else if (getType(val) === 'object' || getType(val) === 'array') {
            util.findSensitiveKeys(val, result);
          }
        }
      }
      return result;
    },

    hashAllSensitive: (sensitiveList, index, callback) => {
      if (index >= sensitiveList.length) {
        callback();
        return;
      }
      const item = sensitiveList[index];
      const raw = item.parent[item.key];
      const isPhone = raw.indexOf('__sensitive_phone__:') === 0;
      const prefix = isPhone ? '__sensitive_phone__:' : '__sensitive__:';
      const rawVal = raw.substring(prefix.length);

      util.hashSensitive(rawVal, isPhone, (hashed) => {
        item.parent[item.key] = hashed;
        util.hashAllSensitive(sensitiveList, index + 1, callback);
      });
    },

    buildDedupKey: (ev, name, payload) => {
      let payloadStr = JSON.stringify(payload) || '';
      return ev + '|' + name + '|' + payloadStr;
    },
  };

  const attachCore = {
    ga4Event: (n, d) =>
      attachCore.dispatch('atm.ga4.event', n, 'event_data', d, false),
    ga4Ecommerce: (n, d) =>
      attachCore.dispatch('atm.ga4.ecommerce', n, 'ecommerce', d, false),
    fbEcommerce: (n, d) =>
      attachCore.dispatch('atm.fb.ecommerce', n, 'fb_event_data', d, true),

    dispatch: (ev, name, layer, payload, isFb) => {
      if (!ev || !name || getType(name) !== 'string' || !name.trim()) {
        util.log('dispatch abortado: nombre de evento inválido', {
          ev: ev,
          name: name,
        });
        return;
      }

      let p = {event: ev};

      if (isFb) {
        p.fb_event_name = util.toPascalCase(name);
      } else {
        p.event_name = util.toSnakeCase(name);
      }

      const cleaned = util.cleanSync(payload, layer, 0, []);
      const sensitiveList = util.findSensitiveKeys(cleaned);

      util.hashAllSensitive(sensitiveList, 0, () => {
        p[layer] = cleaned;

        let payloadStr = JSON.stringify(p[layer]);
        let size = payloadStr ? payloadStr.length : 0;
        if (size > payloadSizeLimit) {
          util.log(
            'Payload excede ' +
              payloadSizeLimit +
              ' bytes (' +
              size +
              ' bytes), evento abortado: ' +
              name,
          );
          return;
        }

        const dedupKey = util.buildDedupKey(ev, name, p[layer]);
        const now = getTimestampMillis();
        if (dedupCache[dedupKey] && now - dedupCache[dedupKey] < dedupWindow) {
          util.log('Evento duplicado ignorado: ' + name);
          return;
        }
        dedupCache[dedupKey] = now;

        let resetObj = {};
        resetObj[layer] = null;

        dataLayerPush(resetObj);
        dataLayerPush(p);

        util.log(ev, p);
      });
    },
  };

  // Exponer el SDK en window
  window.attach = attachCore;

  // Evento ready
  dataLayerPush({event: 'attach.ready'});
  util.log('activado', null);
})();
