/**
 * Copyright (C) 2023 Zuoqiu Yingyi
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import "@/styles/vditor.less";
import manifest from "~/public/plugin.json";
import { Logger } from "@workspace/utils/logger";
import { trimSuffix } from "@workspace/utils/misc/string";
import {
    FLAG_ELECTRON,
    FLAG_IFRAME,
    FLAG_POPUP,
} from "@workspace/utils/env/native-front-end";

import Vditor from "@/components/Vditor.svelte";

const name = manifest.name;
const baseURL = "./../libs/vditor";
const rootURL = trimSuffix(location.pathname, `/plugins/${name}/iframes/vditor.html`);

var editor: InstanceType<typeof Vditor>; // 编辑器组件

const logger = new Logger(`${name}-vditor-${(() => {
    switch (true) {
        case FLAG_ELECTRON:
            return "window";
        case FLAG_IFRAME:
            return "iframe";
        case FLAG_POPUP:
            return "popup";
        default:
            return "unknow";
    }
})()}`);

/* 创建新的编辑器 */
editor = new Vditor({
    target: globalThis.document.body,
    props: {
        plugin: {
            name: name,
            i18n: undefined,
            logger: logger,
        },
        baseURL,
        rootURL,
        debug: false,
    },
});
editor.$on("open-link", e => {
    logger.debug(e.detail);
})
