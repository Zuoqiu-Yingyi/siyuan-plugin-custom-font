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

import type { ComponentEvents } from "svelte";
import { get } from "svelte/store";

import Node from "@workspace/components/siyuan/tree/file/Node.svelte";
import {
    FileTreeNodeType,
    type ITree,
    type IFileTreeNode,
    type IFileTreeNodeStores,
    type IFileTreeRootNode,
} from "@workspace/components/siyuan/tree/file";
import { normalize } from "@workspace/utils/path/normalize";
import {
    join,
    dirname,
    basename,
    extname,
} from "@workspace/utils/path/browserify";

import type MonacoEditorPlugin from "@/index";

/* 资源 */
export interface IItem {
    name: string; // 文件名/文件夹名
    path: string; // 绝对路径
    relative: string; // 相对于工作空间目录的相对路径
    isFile: boolean; // 是否为文件
    isFolder: boolean; // 是否为文件夹
}

/* 下级资源列表 */
export interface IResources {
    count: number;
    files: IItem[];
    folders: IItem[];
    directory: string;
}

export type DefaultNodeProps = Required<Pick<
    IFileTreeNode,
    "root"
    | "indent"
    | "toggleIcon"
    | "toggleAriaLabel"
    | "menuIcon"
    | "menuAriaLabel"
    | "countAriaLabel"
>>;

/* 文件资源管理器 */
export class Explorer implements ITree {
    public static ICONS = {
        workspace: "#iconWorkspace",
        folder_opend: "#icon-monaco-editor-folder-opend",
        folder_closed: "#icon-monaco-editor-folder-closed",
    } as const;

    /* 树节点集合 */
    protected readonly set: Set<IFileTreeNodeStores>;
    /* 路径->节点 */
    protected readonly map: Map<IFileTreeNode["path"], IFileTreeNodeStores>;
    /* 根节点列表 */
    protected roots: IFileTreeRootNode[];

    constructor(
        public readonly plugin: InstanceType<typeof MonacoEditorPlugin>, // 插件对象
        public readonly workspace: string, // 工作空间目录
        public readonly defaultNodeProps: DefaultNodeProps = { // 节点的默认属性
            // type: undefined,
            // name: undefined,
            // path: undefined,
            root: workspace,
            // depth: undefined,
            indent: "1em",
            // relative: undefined,
            // directory: undefined,

            // focus: undefined,
            // folded: undefined,
            // draggable: undefined,
            // hideActions: undefined,

            // title: undefined,
            // children: undefined,

            toggleIcon: "#iconRight",
            toggleAriaLabel: plugin.i18n.explorer.toggle.ariaLabel,

            // icon: undefined,
            // iconAriaLabel: undefined,

            // text: undefined,
            // textAriaLabel: undefined,

            menuIcon: "#iconMore",
            menuAriaLabel: plugin.i18n.explorer.menu.ariaLabel,

            // count: undefined,
            countAriaLabel: plugin.i18n.explorer.count.ariaLabel,
        },
    ) {
        this.map = new Map();
        this.set = new Set();
    }

    public path2node(path: string): IFileTreeNodeStores | undefined {
        return this.map.get(path);
    }

    /* 创建根节点 */
    public createRootNodes(): IFileTreeRootNode[] {
        this.roots = [
            {
                ...this.defaultNodeProps,
                type: FileTreeNodeType.Root,
                name: basename(this.workspace),
                path: this.workspace,
                depth: 0,
                relative: "./",
                directory: dirname(this.workspace),

                folded: true,

                title: this.workspace,

                icon: Explorer.ICONS.workspace,
                iconAriaLabel: this.plugin.i18n.explorer.workspace.name,

                text: this.plugin.i18n.explorer.workspace.name,
                textAriaLabel: "./",
            },
        ];
        return this.roots;
    }

    /* 添加节点 */
    public readonly appendNode = (node: IFileTreeNodeStores) => {
        this.call(
            node,
            node => {
                const id = get(node.path);
                this.map.set(id, node); // 覆盖对应 ID 的节点
                this.set.add(node); // 添加节点对象
            },
            true,
        );
    }

    /* 移除节点 */
    public readonly removeNode = (node: IFileTreeNodeStores) => {
        this.call(
            node,
            node => {
                const id = get(node.path);
                if (this.map.has(id)) { // 移除节点
                    this.map.delete(id);
                    get(node.children)
                        ?.map(node => this.map.get(node.path))
                        .filter(node => node)
                        .forEach(this.removeNode);
                }
                this.set.delete(node);
            },
            true,
        );
    }

    /* 打开事件 */
    public readonly open = (e: ComponentEvents<Node>["open"]) => {
        // plugin.logger.debug(e);
        const props = e.detail.props;

        switch (get(props.type)) {
            case FileTreeNodeType.File: {  // 打开文件
                const ext = extname(get(props.name)); // 文件扩展名
                // TODO: 打开文件
                break;
            }
            case FileTreeNodeType.Root:
            case FileTreeNodeType.Folder:
            default: // 切换文件夹折叠状态
                switch (get(props.folded)) {
                    case true:
                        props.folded.set(false);
                        props.icon.set(Explorer.ICONS.folder_opend);
                        break;
                    case false:
                    default:
                        props.folded.set(true);
                        props.icon.set(Explorer.ICONS.folder_closed);
                        break;
                }
                break;
        }
    }

    /* 折叠文件夹 */
    public readonly fold = (e: ComponentEvents<Node>["fold"]) => {
        // plugin.logger.debug(e);
        const props = e.detail.props;

        this.collapseNode(props);
    }

    /* 展开文件夹 */
    public readonly unfold = async (e: ComponentEvents<Node>["unfold"]) => {
        // plugin.logger.debug(e);
        const props = e.detail.props;

        switch (get(props.type)) {
            case FileTreeNodeType.File: // 文件无需加载下级内容
                break;
            case FileTreeNodeType.Root:
            case FileTreeNodeType.Folder:
            default: {
                this.expandNode(props);
                break;
            }
        }
    }

    /**
     * 列出指定目录下的资源
     * @param relative: 相对于工作空间目录的路径
     */
    protected async ls(relative: string): Promise<IResources> {
        relative = normalize(relative);
        const directory = join(this.workspace, relative);

        /* 获取下级资源列表 */
        const response = await this.plugin.client.readDir({
            path: relative,
        });

        const resources: IResources = {
            count: response.data.length,
            files: [],
            folders: [],
            directory,
        };

        /* 资源分类 */
        response.data.forEach(item => {
            if (item.isDir) {
                resources.folders.push({
                    name: item.name,
                    path: join(directory, item.name),
                    relative: join(relative, item.name),
                    isFile: false,
                    isFolder: true,
                });
            }
            else {
                resources.files.push({
                    name: item.name,
                    path: join(directory, item.name),
                    relative: join(relative, item.name),                    // relative: `${relative}/${item.name}`,
                    isFile: true,
                    isFolder: false,
                });
            }
        });
        return resources;
    }

    /**
     * 将资源列表转换为节点列表
     */
    protected resources2nodes(resources: IResources): IFileTreeNode[] {
        const nodes: IFileTreeNode[] = [];

        /* 文件夹节点 */
        resources.folders.forEach(item => {
            nodes.push({
                ...this.defaultNodeProps,
                type: FileTreeNodeType.Folder,
                name: item.name,
                path: item.path,
                root: this.workspace,
                relative: item.relative,
                directory: resources.directory,

                folded: true,

                title: item.path,

                icon: Explorer.ICONS.folder_closed,
                iconAriaLabel: this.plugin.i18n.explorer.folder.ariaLabel,

                text: item.name,
                textAriaLabel: item.relative,
            });
        });

        /* 文件节点 */
        resources.files.forEach(item => {
            nodes.push({
                ...this.defaultNodeProps,
                type: FileTreeNodeType.File,
                name: item.name,
                path: item.path,
                root: this.workspace,
                relative: item.relative,
                directory: resources.directory,

                title: item.path,

                icon: "#iconFile",
                iconAriaLabel: this.plugin.i18n.explorer.file.ariaLabel,

                text: item.name,
                textAriaLabel: item.relative,
            });
        });

        return nodes;
    }

    /* 更新节点状态与下级节点 */
    protected async updateNode(node: IFileTreeNodeStores) {
        const resources = await this.ls(get(node.relative));
        const children = this.resources2nodes(resources);

        node.count.set(resources.count); // 设置资源数量
        node.children.set(children); // 设置下级资源节点
    }

    /* 展开节点 */
    protected async expandNode(
        node: IFileTreeNodeStores,
    ) {
        /* 若未加载, 先查询资源 */
        if (!get(node.children)) {
            await this.updateNode(node);
        }

        /* 展开并更新图标 */
        node.folded.set(false);
        if (get(node.type) === FileTreeNodeType.Folder) {
            node.icon.set(Explorer.ICONS.folder_opend);
        }
    }

    /**
     * 收缩节点
     * @param node: 节点
     * @param recursive: 是否递归收缩
     */
    public readonly collapseNode = (
        node: IFileTreeNodeStores,
        recursive: boolean = false,
    ) => {
        this.call(
            node,
            node => {
                node.folded.set(true);
                if (get(node.type) === FileTreeNodeType.Folder) {
                    node.icon.set(Explorer.ICONS.folder_closed);
                }
            },
            recursive,
        );
    }

    /**
     * 递归遍历节点
     * @param node: 节点
     * @param callback: 回调函数
     * @param recursive: 是否递归遍历
     */
    public call(
        node: IFileTreeNodeStores,
        callback: (node: IFileTreeNodeStores) => void,
        recursive: boolean,
    ): void {
        callback(node);
        if (recursive) {
            get(node.children)
                ?.map(node => this.map.get(node.path))
                .filter(node => !!node)
                .forEach(callback);
        }
    }
}
