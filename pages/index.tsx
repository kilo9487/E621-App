import { useCallback, useEffect, useRef, useState, useMemo, RefObject, ReactNode, MouseEventHandler, Dispatch, SetStateAction, JSX } from "react";
import style from "./style.module.scss";
import { LABS_E621_API } from "@/pages/api/_LABS/E621-API/_API-LIST";
import { WindowInstance, WindowManager, WindowSnapshot } from "@/data/components/Window/WindowManager";
import { _app, Kiasole, newInput } from "@/pages/_app";
import { E621 } from "@/pages/api/_LABS/E621-API/types/e621";
import { Button } from "./components/Button";
import useLocalStorage, { SetValue } from "@/data/module/use/LocalStorage";
import { WindowRect } from "@/data/components/Window/Window";
import { makeQuery } from "@/pages/api/_LABS/E621-API/lib/e621-core";
import { cloneDeep } from "lodash";
import functions from "@/data/module/functions";
import Viewer from "@/data/components/Viewer";
import KiloDown from "@/data/components/KiloDown";
import React from "react";

let userIndex = 0

let wmRef: RefObject<WindowManager<e621Type.defaul> | null>;

const StopEvent = (e: any) => {
  e.preventDefault()
  e.stopPropagation()
}

namespace e621Type {

  export namespace DragItemType {

    export const appname = "application/e621"

    export type tag = {
      type: "tag"
      data: {
        action: "+" | "-" | "="
        tag: string
      }
    }

    export type post = {
      type: "post"
      data: E621.Post
    }

    export type postSearch = {
      type: "postSearch"
      thisWindow?: WindowInstance<e621Type.defaul>
      data: e621Type.window.dataType.postSearch
    }

    export type defaul =
      | tag
      | post
      | postSearch

  }

  export namespace window {

    export namespace dataType {

      export type postSearch = {
        nowPage: number,
        pageCache: { [x: number]: E621.Post[] },
        searchTags: string[],
      }

      export type pool = {
        poolId: number,
        poolInfo?: E621.Pool,
        nowPage: number,
        pageCache: { [x: number]: E621.Post[] },
      }

      export namespace settingTabs {

        export const categorieList: ("search" | "account" | "download" | "appearance" | "information")[] = [
          "search",
          "account",
          "download",
          "appearance",
          "information",
        ]

        export const pageList = {
          search: [
            "general",
            "tags",
            "history",
            "export/import",
          ],
          account: [
            "local",
            "e621",
            "export/import",
          ],
          download: [
            "general",
            "history",
            "export/import",
          ],
          appearance: [
            "general",
            "theme",
            "wallpaper",
          ],
          information: [
            "general",
          ],
        }

        export type Search = {
          categorie: "search",
          pages:
          | "general"
          | "tags"
          | "history"
          | "export/import"
        }

        export type Account = {
          categorie: "account",
          pages:
          | "local"
          | "e621"
          | "export/import"
        }

        export type Download = {
          categorie: "download",
          pages:
          | "general"
          | "history"
          | "export/import"
        }

        export type Appearance = {
          categorie: "appearance",
          pages:
          | "general"
          | "theme"
          | "wallpaper"
        }

        export type Information = {
          categorie: "information",
          pages:
          | "general"
        }

        export type _All =
          | "NONE"
          | Search
          | Account
          | Download
          | Appearance
          | Information
      }

      export type setting = settingTabs._All

    }

    export type postSearch = {
      type: "postSearch",
      note?: string,
      data: dataType.postSearch
    }

    export type setting = {
      type: "setting",
      data: dataType.setting
    }

    export type post = {
      type: "post",
      note?: string,
      data: {
        postId: number,
        cachedPost?: E621.Post,
        parentData?: {
          windowID: string
          rect: WindowRect
          title: string
          componentType: "postSearch"
          customData: postSearch
        }
      }
    }

    export type viewer = {
      type: "viewer",
      note?: string,
      data: E621.Post
    }

    export type postGetByID = {
      type: "postGetByID",
      note?: string,
      data: {
        currentId: number | string,
        fetchedPost?: E621.Post | null,
        status: "idle" | "loading" | "error" | "success"
      }
    }

    export type pool = {
      type: "pool",
      note?: string,
      data: dataType.pool
    }

    export type tmp = {
      type: "tmp",
    }
  }

  export type defaul =
    | window.setting
    | window.postSearch
    | window.post
    | window.postGetByID
    | window.pool
    | window.tmp
    | window.viewer

}

export namespace SettingEditor {

  export type ListOperations<T> = {
    moveUp: (index: number) => void;
    moveDown: (index: number) => void;
    moveToTop: (index: number) => void;
    removeItem: (index: number) => void;
    addItem: (newItem: T) => void;
    duplicateItem: (index: number) => void;
    canMoveUp: (index: number) => boolean;
    canMoveDown: (index: number) => boolean;
    isMaxReached: boolean;
    isMinReached: boolean;
  };

  export type ItemOperations<T> = {
    moveUp: () => void;
    moveDown: () => void;
    moveToTop: () => void;
    remove: () => void;
    duplicate: () => void;
    update: (newValue: T) => void;
    isFirst: boolean;
    isLast: boolean;
  };

  export type WrappedItem<T> = {
    data: T;
    index: number;
    ops: ItemOperations<T>;
  };

  export type ListControl<T> = {
    items: WrappedItem<T>[];
    addItem: (newItem: T) => void;
    isMaxReached: boolean;
  };

  export namespace Inputs {
    export type String = {
      width?: number;
      value: string;
      onChange: (e: string) => void;
    };

    export type Number = {
      width?: number;
      value: number;
      float?: boolean;
      onChange: (e: number) => void;
    };
  }

  export type List<T> = {
    max?: number;
    min?: number;
    list: T[];
    onChange: (e: T[]) => void;
    children: (control: ListControl<T>) => React.ReactNode;
  };

  export function useListController<T>(props: List<T>): ListOperations<T> {
    const { list, onChange, max = Infinity, min = 0 } = props;

    const moveUp = (index: number) => {
      if (index <= 0) return;
      const clone = [...list];
      [clone[index - 1], clone[index]] = [clone[index], clone[index - 1]];
      onChange(clone);
    };

    const moveDown = (index: number) => {
      if (index >= list.length - 1) return;
      const clone = [...list];
      [clone[index + 1], clone[index]] = [clone[index], clone[index + 1]];
      onChange(clone);
    };

    const moveToTop = (index: number) => {
      if (index === 0) return;
      const clone = [...list];
      const [item] = clone.splice(index, 1);
      clone.unshift(item);
      onChange(clone);
    };

    const removeItem = (index: number) => {
      if (list.length <= min) {
        console.warn('Reached minimum limit');
        return;
      }
      const clone = [...list];
      clone.splice(index, 1);
      onChange(clone);
    };

    const addItem = (newItem: T) => {
      if (isMaxReached) {
        console.warn('Reached maximum limit');
        return;
      }
      const clone = [...list, newItem];
      onChange(clone);
    };

    const duplicateItem = (index: number) => {
      if (isMaxReached) {
        console.warn('Reached maximum limit');
        return;
      }

      const itemClone = JSON.parse(JSON.stringify(list[index]));

      const newList = [...list];
      newList.splice(index + 1, 0, itemClone);

      onChange(newList);
    };

    const isMaxReached = list.length >= max;
    const isMinReached = list.length <= min;


    return {
      moveUp,
      moveDown,
      moveToTop,
      removeItem,
      addItem,
      duplicateItem,
      canMoveUp: (i) => i > 0,
      canMoveDown: (i) => i < list.length - 1,
      isMaxReached,
      isMinReached
    };
  }

  export const ListEditor = <T extends any>(props: List<T>) => {
    const { list, onChange, max = Infinity, min = 0, children } = props;

    const addItem = (newItem: T) => {
      if (list.length >= max) return;
      onChange([...list, newItem]);
    };

    const itemsWithOps: WrappedItem<T>[] = list.map((item, index) => {

      const moveUp = () => {
        if (index === 0) return;
        const clone = [...list];
        [clone[index - 1], clone[index]] = [clone[index], clone[index - 1]];
        onChange(clone);
      };

      const moveDown = () => {
        if (index === list.length - 1) return;
        const clone = [...list];
        [clone[index + 1], clone[index]] = [clone[index], clone[index + 1]];
        onChange(clone);
      };

      const moveToTop = () => {
        if (index === 0) return;
        const clone = [...list];
        const [target] = clone.splice(index, 1);
        clone.unshift(target);
        onChange(clone);
      };

      const remove = () => {
        if (list.length <= min) return;
        const clone = [...list];
        clone.splice(index, 1);
        onChange(clone);
      };

      const duplicate = () => {
        if (list.length >= max) return;
        const cloneItem = JSON.parse(JSON.stringify(item));
        const cloneList = [...list];
        cloneList.splice(index + 1, 0, cloneItem);
        onChange(cloneList);
      };

      const update = (newValue: T) => {
        const clone = [...list];
        clone[index] = newValue;
        onChange(clone);
      };


      return {
        data: item,
        index,
        ops: {
          moveUp,
          moveDown,
          moveToTop,
          remove,
          duplicate,
          update,
          isFirst: index === 0,
          isLast: index === list.length - 1
        }
      };
    });

    return (
      <>
        {children({
          items: itemsWithOps,
          addItem,
          isMaxReached: list.length >= max
        })}
      </>
    );
  };

}

namespace workSpaceType {
  export namespace Unit {
    export namespace BaseItem {
      export type Image = {
        url: string
        positionX?: number
        positionY?: number
        scale?: number
        fromPost?: E621.Post
      }

      export type DownloadItems = {
        id: number
        url: string
        at: number
      }

      export type TmpItem = {
        name?: string,
        createAt: number,
        windowId: string,
        windowTitle: string,
        data: e621Type.defaul
      }
    }

    export type SaveInfo = {
      id: string;
      user: {
        name: string;
        avatar: BaseItem.Image;
        passKey?: string;
        e621?: {
          name: string;
          key: string;
        };
      };
      loginStatus?: {
        lastLogin: number
      }
    }

    export type Setting = {
      search: {
        ratingLimit: {
          s: boolean,
          q: boolean,
          e: boolean,
        },
        blackList: string[],
        quickTag: string[],
      },
      download: {
        format: string,
        maxConcurrentDownloads: number,
      },
      appearance: {
        scale: number,
        color: string,
        transparens: boolean;

        clockFormat: string[];
        wallpaper: Unit.BaseItem.Image,
      },
    }

    export type Saves = {
      download: BaseItem.DownloadItems[]
      tmpList: BaseItem.TmpItem[]
      wallpapers: Unit.BaseItem.Image[],
    }

    export type History = {
      search: string[],
      color: string[],
      wallpaper: Unit.BaseItem.Image[],
      download: BaseItem.DownloadItems[],
    }

    export type windowsStatus = WindowSnapshot<e621Type.defaul>[]
  }

  export type User = {
    saveInfo: Unit.SaveInfo,
    setting: Unit.Setting,
    saves: Unit.Saves,
    history: Unit.History
    windowsStatus: Unit.windowsStatus
  }

  export type defaul = {
    lastUser?: number,
    rememberPassword?: string
    autoLogin: boolean
    userList: User[]
  }
}

namespace MenuAction {

  export type Item =
    | [string, () => void]
    | [string, () => void, undefined]
    | [string, () => void, e621Type.DragItemType.defaul]

  export type CenterPoint =
    | "tl"
    | "tc"
    | "tr"
    | "cl"
    | "cc"
    | "cr"
    | "bl"
    | "bc"
    | "br"

  export type ActionType = {
    showMenu: (
      menuList: Item[],
      position: [number, number],
      center?: CenterPoint,
      onDrag?: (e: dragEvent) => void,
    ) => void
    closeMenu: () => void
  }
}

const MenuAction: MenuAction.ActionType = {
  showMenu: () => { },
  closeMenu: () => { }
}

type PostsCache = Record<number, E621.Post[]>;

const someActions = {
  setAsWallpaper: (userIndex: number, url: string, post?: E621.Post,) => {

    setWorkSpaceStatus(prev => {
      const _ = cloneDeep(prev)

      _.userList[userIndex].setting.appearance.wallpaper = {
        url,
        positionX: 50,
        positionY: 50,
        fromPost: post
      }

      return _
    })

  },
  saveToTmp: (userIndex: number, item: e621Type.defaul, title: string, windowId: string) => {

    setWorkSpaceStatus(prev => {
      const _ = cloneDeep(prev)

      _.userList[userIndex].saves.tmpList.push({
        createAt: new Date().getTime(),
        windowTitle: title,
        windowId,
        data: cloneDeep(item),
      })

      return _
    })

  },
  writeToClipboard: (data: string) => {
    navigator.clipboard.writeText(data)
  },
  openWithGetByID: (post: E621.Post) => { },
  openWithViewer: (post: E621.Post) => { },
}

const cnvFormat = {
  downloads: (post: E621.Post, addDate: number, format: string) => {
    /* 
     * 
     * 基本上 能加的東西 都比照 The Wolf's Stash 當然 會有一些額外的東西
     * 所以一樣的 能打斜綫來區分路徑 就是 不同資料夾
     * 
     * %id%                       - 作品ID
     *    
     * %artist%                   - 作者名 預設用“_”來分割
     * %artist(,)%                - 作者名 可以自定分割符 括號裏面指定分隔符
     * %artist--tag1,tag2%        - 作者名 可以自定要排除掉的不想出現在檔案名稱的標簽
     * %artist(,)--tag1,tag2%     - 作者名 既自定了分割符 又自定了要排掉的東西
     * 
     * %character%                - 角色名稱 預設用“_”來分割
     * %character(,)%             - 角色名稱 可以自定分割符 括號裏面指定分隔符
     * %character--tag1,tag2%     - 角色名稱 可以自定要排除掉的不想出現在檔案名稱的標簽
     * %character(,)--tag1,tag2%  - 角色名稱 既自定了分割符 又自定了要排掉的東西
     * 
     * %copyright%                - 版權 預設用“_”來分割
     * %copyright(,)%             - 版權 可以自定分割符 括號裏面指定分隔符
     * %copyright--tag1,tag2%     - 版權 可以自定要排除掉的不想出現在檔案名稱的標簽
     * %copyright(,)--tag1,tag2%  - 版權 既自定了分割符 又自定了要排掉的東西
     * 
     * %general%                  - 主要 預設用“_”來分割
     * %general(,)%               - 主要 可以自定分割符 括號裏面指定分隔符
     * %general--tag1,tag2%       - 主要 可以自定要排除掉的不想出現在檔案名稱的標簽
     * %general(,)--tag1,tag2%    - 主要 既自定了分割符 又自定了要排掉的東西
     * 
     * %species%                  - 物種 預設用“_”來分割
     * %species(,)%               - 物種 可以自定分割符 括號裏面指定分隔符
     * %species--tag1,tag2%       - 物種 可以自定要排除掉的不想出現在檔案名稱的標簽
     * %species(,)--tag1,tag2%    - 物種 既自定了分割符 又自定了要排掉的東西
     * 
     * %tags%                     - 所有標簽 預設用“_”來分割
     * %tags(,)%                  - 所有標簽 可以自定分割符 括號裏面指定分隔符
     * %tags--tag1,tag2%          - 所有標簽 可以自定要排除掉的不想出現在檔案名稱的標簽
     * %tags(,)--tag1,tag2%       - 所有標簽 既自定了分割符 又自定了要排掉的東西
     * 
     * %rating%                   - 評級
     * %rating(S|Q|E)%            - 評級 但用你自己定義的詞
     * 
     * %score%                    - 作品評分
     * %favs%                     - 收藏數
     * 
     * :HH:                       - 加入到下載隊列的時間 24小時制的小時
     * :mm:                       - 加入到下載隊列的時間 分鐘
     * :ss:                       - 加入到下載隊列的時間 秒
     * :ms:                       - 加入到下載隊列的時間 毫秒 (我相信沒人用到)
     *                       
     * -YY-                       - 加入到下載隊列的時間 四位數的年份
     * -yy-                       - 加入到下載隊列的時間 兩位數的年份
     * -mm-                       - 加入到下載隊列的時間 數字的月
     * -dd-                       - 加入到下載隊列的時間 日
     * 
     * 
     * 反正 下面先列出幾個範例
     * 
     * KIASE.PIC_DB的標準格式 平臺_評級_作品ID_日期_時間
     * 笑死 這個東西其實就是從pixiv存圖用的格式改出來的
     * E621_%rating(NOR|NOR|SEX)%_%id%_-YY--mm--dd-_:HH::mm::ss:
     * 這個是沒有前綴的版本
     * %rating(NOR|NOR|SEX)%_%id%_-YY--mm--dd-_:HH::mm::ss:
     * 
     * 很經典的 作者加上ID
     * 然後每次存某些東西的時候 都有個sound_warning 所以索性拔掉
     * %artist--sound_warning% - %id%
     * 
     */
    const date = new Date(addDate);

    const pad = (num: number, pad?: number) => {
      return num.toString().padStart(pad ?? 2, "0");
    };

    const str = (num: number) => {
      return num.toString()
    };

    const tagReplase = (source: string, name: string, array: string[]) => {
      return source
        .replaceAll(`%${name}%`, array.join("_"))

        .replaceAll(new RegExp(`%${name}\\((.*)\\)%`, "g"), (_, join: string) => array.join(join))

        .replaceAll(new RegExp(`%${name}--(.*)%`, "g"), (
          _,
          exclude: string
        ) => {
          return array.filter(e =>
            !exclude.split(",")
              .some(x => e === x)
          ).join("_")
        })

        .replaceAll(new RegExp(`%${name}\\((.*)\\)--(.*)%`, "g"), (
          _,
          join: string,
          exclude: string
        ) => {
          return array.filter(e =>
            !exclude
              .split(",")
              .some(x => e === x)
          ).join(join)
        })
    };

    const rep01 = format
      .replaceAll(":HH:", pad(date.getHours()))
      .replaceAll(":mm:", pad(date.getMinutes()))
      .replaceAll(":ss:", pad(date.getSeconds()))
      .replaceAll(":ms:", pad(date.getSeconds(), 3))
      .replaceAll("-YY-", str(date.getFullYear()))
      .replaceAll("-yy-", str(date.getFullYear()).slice(-2))
      .replaceAll("-mm-", pad(date.getMonth() + 1))
      .replaceAll("-dd-", pad(date.getDate()))


      .replaceAll("%id%", str(post.id))
      .replaceAll("%artist%", post.tags.artist.join("_"))
      .replaceAll("%character%", post.tags.character.join("_"))
      .replaceAll("%copyright%", post.tags.character.join("_"))
      .replaceAll("%general%", post.tags.character.join("_"))
      .replaceAll("%species%", post.tags.character.join("_"))

      .replaceAll("%rating%", post.rating.toUpperCase())
      .replaceAll("%score%", str(post.score.total))
      .replaceAll("%favs%", str(post.fav_count))

      .replaceAll("%tags%", [
        ...post.tags.artist,
        ...post.tags.character,
        ...post.tags.copyright,
        ...post.tags.general,
        ...post.tags.invalid,
        ...post.tags.lore,
        ...post.tags.meta,
        ...post.tags.species,
      ].join("_"))

      .replaceAll(/%rating\((.*)\|(.*)\|(.*)\)%/g, (_, s, q, e) => {
        switch (post.rating) {
          case "s":
            return s
          case "q":
            return q
          case "e":
            return e
        }
      })

    const rep02 = tagReplase(rep01, "artist", post.tags.artist);
    const rep03 = tagReplase(rep02, "character", post.tags.artist);
    const rep04 = tagReplase(rep03, "copyright", post.tags.artist);
    const rep05 = tagReplase(rep04, "general", post.tags.artist);
    const rep06 = tagReplase(rep05, "species", post.tags.artist);
    const rep07 = tagReplase(rep06, "tags", post.tags.artist);

    return rep07
  },
  clock: (_date: number, format: string) => {
    /* 
     * :hh: - 12小時制的小時
     * :HH: - 24小時制的小時
     * :mm: - 分鐘
     * :ss: - 秒
     * 
     * -YY- - 四位數的年份
     * -yy- - 兩位數的年份
     * -MM- - 月
     * -mm- - 數字的月
     * -dd- - 日
     */
    const date = new Date(_date);

    const pad = (num: number) => {
      return num.toString().padStart(2, "0");
    };

    const str = (num: number) => {
      return num.toString()
    };

    const rep01 = format
      .replaceAll(":HH:", pad(date.getHours()))
      .replaceAll(":mm:", pad(date.getMinutes()))
      .replaceAll(":ss:", pad(date.getSeconds()))
      .replaceAll("-YY-", str(date.getFullYear()))
      .replaceAll("-yy-", str(date.getFullYear()).slice(-2))
      .replaceAll("-MM-", [
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"
      ][date.getMonth()])
      .replaceAll("-mm-", pad(date.getMonth() + 1))
      .replaceAll("-dd-", pad(date.getDate()))

    return rep01
  },
}

const dragItem = (e: React.DragEvent, item: e621Type.DragItemType.defaul, ext?: object) => {
  e.dataTransfer.setData(e621Type.DragItemType.appname, JSON.stringify(item));

  let url = "";
  switch (item.type) {
    case "tag": {
      let q = makeQuery({ tags: item.data.tag })
      if (item.data.action === "-") q = makeQuery({ tags: "-" + item.data.tag });
      url = "https://e621.net/posts?" + q;

      break;
    };
    case "post": {
      url = "https://e621.net/posts/" + item.data.id;
      break;
    };
    case "postSearch": {
      url = "https://e621.net/posts?" + makeQuery({ tags: item.data.searchTags.join(" ") });
      break;
    };
  };

  e.dataTransfer.setData("text/uri-list", url + makeQuery(ext ?? {}))
}

type EmptyAccountOption = {
  name: string,
  id: string,
  password?: string,
  color?: string,
  avatar?: workSpaceType.Unit.BaseItem.Image,
  wallpaper?: workSpaceType.Unit.BaseItem.Image,
  e621?: {
    name: string;
    key: string;
  }
}

const EmptyAccount: ((option: EmptyAccountOption) => workSpaceType.User) = (opt: EmptyAccountOption) => {
  return {
    saveInfo: {
      user: {
        name: opt.name,
        avatar: opt.avatar ?? {
          url: "/_SYSTEM/Images/root/avatar.png"
        },
        passKey: opt.password,
        e621: opt.e621
      },
      id: opt.id,

    },
    setting: {
      search: {
        ratingLimit: {
          s: true,
          q: false,
          e: false,
        },
        blackList: ["gore", "scat"],
        quickTag: [],
      },
      download: {
        format: "%artist% - %id%",
        maxConcurrentDownloads: 2,
      },
      appearance: {
        scale: 100,
        color: opt.color ?? "#ffffff",
        wallpaper: opt.wallpaper ?? {
          url: "/_SYSTEM/Images/root/background.png"
        },
        clockFormat: [
          ":HH:::mm:::ss:",
          "-dd- -MM- -YY-",
        ],
        transparens: false,
      }
    },
    saves: {
      download: [],
      wallpapers: [],
      tmpList: [],
    },
    history: {
      search: [],
      wallpaper: [],
      color: [],
      download: [],
    },
    windowsStatus: []
  }
}

const DefaultCfg: workSpaceType.defaul = {
  lastUser: 1,
  autoLogin: true,
  userList: []
}

const defaultStatus: workSpaceType.defaul = DefaultCfg

let [workSpaceStatus, setWorkSpaceStatus]: [workSpaceType.defaul, SetValue<workSpaceType.defaul>] = [defaultStatus, () => { }]
let [isLogin, setIsLogin]: [boolean, Dispatch<SetStateAction<boolean>>] = [false, () => { }]

type MenuButtonType = [string, MenuAction.Item[]];

type dragEvent = (event: React.DragEvent<HTMLDivElement>) => void

interface WindowFrameProps {
  menulist: MenuButtonType[];
  className?: string;
  children: ReactNode;
  onDrop?: dragEvent
  onDrag?: dragEvent
  onDragCapture?: dragEvent
  onDragEnd?: dragEvent
  onDragEndCapture?: dragEvent
  onDragEnter?: dragEvent
  onDragEnterCapture?: dragEvent
  onDragExit?: dragEvent
  onDragExitCapture?: dragEvent
  onDragLeave?: dragEvent
  onDragLeaveCapture?: dragEvent
  onDragOver?: dragEvent
  onDragOverCapture?: dragEvent
  onDragStart?: dragEvent
  onDragStartCapture?: dragEvent
}

const Components = {
  Card: ({ post, onClick, actionMenu, delay, q }: {
    post: E621.Post,
    onClick?: MouseEventHandler<HTMLButtonElement>,
    actionMenu: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, post: E621.Post) => void,
    delay?: number,
    q?: object
  }) => {
    const [start, setStart] = useState<boolean>(false)

    const eRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      void eRef.current!.clientHeight
      setStart(true)
    }, [])

    const totalScore = post.score.total
    const favIsNav = totalScore === 0 ? null : totalScore < 0 ? "--" : "++"

    const hoverTips = [
      `Rating ${post.rating}`,
      `ID ${post.id}`,
      `Create at ${post.created_at}`,
      `Score ${post.score.total}`,
    ].join("<br/>")

    return <button
      ref={eRef} className={[style["Card"], start ? style["START"] : ""].join(" ")}
      key={post.id}
      onClick={onClick}
      // hover-tips={hoverTips}
      draggable
      onDragStart={(e) => {
        dragItem(e, {
          type: "post",
          data: post
        }, q)
      }}
      style={{
        transitionDelay: delay + "s"
      }}
    >
      <div className={style["previewImage"]}>
        <div className={style["vid"]}>
          <video
            poster={post.preview?.url?.replace(/(.*)\..*/, "$1.jpg")}
          />
        </div>
      </div>

      <div className={style["Info"]}>
        <div className={style["baseInfo"]}>
          {["background", "text"].map(e => <div className={style[e]} key={e}>
            <div className={style["score"]}>
              <div className={[style["up"], favIsNav === "++" ? style["here"] : ""].join(" ")}>
                <div className={style["icon"]}>{"+"}</div>
                <div>{post.score.up}</div>
              </div>

              <div className={[style["down"], favIsNav === "--" ? style["here"] : ""].join(" ")}>
                <div className={style["icon"]}>{"-"}</div>
                <div>{Math.abs(post.score.down)}</div>
              </div>

              <div className={style["fav"]}>
                <div className={style["icon"]}>{"<3"}</div>
                <div>{post.fav_count}</div>
              </div>
            </div>

            <div className={style["rating"]}>
              <div>
                {post.rating.toUpperCase()}
              </div>
            </div>
          </div>)}

        </div>

      </div>

      <div className={style["Action"]}>
        <div className={style["button"]}>
          <button
            kiase-style=""
            onClick={(event) => actionMenu(event, post)}
            onMouseDown={(event) => actionMenu(event, post)}
          >···</button>
        </div>

      </div>
    </button>
  },
  Post: ({ postData, thisWindow }: {
    postData: E621.Post,
    thisWindow?: WindowInstance<e621Type.defaul>
  }) => {
    const [start, setStart] = useState<boolean>(false)

    const eRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      void eRef.current!.clientHeight
      setStart(true)
    }, [])

    const dateToString = (date: string) => {
      const dat = new Date(date)
      const pad = (num: number) => {
        return num.toString().padStart(2, "0")
      }
      return `${dat.getFullYear()}/${pad(dat.getMonth() + 1)}/${pad(dat.getDate())} ${pad(dat.getHours())}:${pad(dat.getMinutes())}`
    }

    return (<div
      ref={eRef}
      className={[style["Post"], start ? style["START"] : ""].join(" ")}
    >
      <div className={style["Tags"]} >
        {
          ([
            ["Artists", postData?.tags.artist],
            ["Copyrights", postData?.tags.copyright],
            ["Character", postData?.tags.character],
            ["Species", postData?.tags.species],
            ["General", postData?.tags.general],
            ["Meta", postData?.tags.meta],
            ["Lore", postData?.tags.lore],
            ["Source", undefined],
            ["Information", undefined],
          ] as [string, (string[] | undefined)][])
            .filter(e => e[1]?.length || (e[0] === "Source" && postData.sources.length > 0) || e[0] === "Information")
            .map((list, indx) => {
              let dely = indx * .15
              if (list[0] === "Source")
                return (
                  <div
                    className={[style["Source"], style["list"]].join(" ")}
                    style={{
                      transitionDelay: `${dely}s`
                    }}
                  >
                    <span className={style["title"]}>{"Source"}</span>
                    <div className={style["src"]}>
                      {
                        postData.sources.map((e, indx) => <a
                          kilo-style=""
                          key={indx}
                          href={e}
                          target="_blank"
                          style={{
                            transitionDelay: `${dely + (indx * .1)}s`
                          }}
                        >{e}</a>)
                      }
                    </div>
                  </div>
                )
              if (list[0] === "Information")
                return <div
                  className={[style["Information"], style["list"]].join(" ")}
                  style={{
                    transitionDelay: `${dely + (indx * .01)}s`
                  }}
                >
                  <span className={style["title"]}>{"Information"}</span>
                  <div className={style["info"]}>
                    {
                      ([
                        ["ID", postData.id],
                        ["MD5", postData.file.md5],
                        ["Size", `${postData.file.width}x${postData.file.height} (${postData.file.size})`],
                        ["Type", postData.file.ext.toLocaleUpperCase()],
                        "CLIP",
                        ["Rating", postData.rating.toLocaleUpperCase()],
                        ["Score", postData.score.total],
                        ["Faves", postData.fav_count],
                        "CLIP",
                        ["Posted", dateToString(postData.created_at)],
                      ] as ([string, string] | "CLIP")[]).map((e, indx) => {
                        if (e === "CLIP") {
                          return <>
                            <div className={style["Clip"]} key={`Clip_${indx}`} />
                            <div className={style["Clip"]} key={`Clip2_${indx}`} />
                          </>
                        } else {
                          return <>
                            <div
                              className={style["key"]}
                              key={`key_${indx}`}
                              style={{
                                transitionDelay: `${dely + (indx * .05)}s`
                              }}
                            >{e[0]}</div>
                            <div
                              className={style["value"]}
                              key={`value_${indx}`}
                              style={{
                                transitionDelay: `${dely + (indx * .05)}s`
                              }}
                            >{e[1]}</div>
                          </>
                        }
                      })
                    }
                  </div>
                </div>
              else
                return <div
                  key={`Tags_${list[0]}`}
                  className={[style[list[0]], style["list"]].join(" ")}
                  style={{
                    transitionDelay: `${dely}s`
                  }}
                >
                  <span className={style["title"]}>{list[0]}</span>
                  <div className={style["tags"]}>
                    {list[1]!.map((tag, indx) => <>
                      <div className={style["tag"]}
                        style={{
                          transitionDelay: `${dely + (indx * .01)}s`
                        }}
                      >
                        <div
                          className={[
                            style["action"],
                            style["add"]
                          ].join(" ")}
                          draggable
                          onDragStart={(e) => {
                            dragItem(e, {
                              type: "tag",
                              data: {
                                action: "+",
                                tag: tag
                              }
                            })
                          }}
                        >{"+"}</div>

                        <div className={[
                          style["action"],
                          style["not"]
                        ].join(" ")}
                          draggable
                          onDragStart={(e) => {
                            dragItem(e, {
                              type: "tag",
                              data: {
                                action: "-",
                                tag: tag
                              }
                            })
                          }}
                        >{"-"}</div>


                        <div
                          className={style["name"]}
                          onClick={() => {
                            const createAt = new Date().getTime()
                            wmRef.current?.createWindow({
                              id: `post_search-${createAt}`,
                              title: `Post Search [ ${createAt} ]`,
                              children: <windowsType.postSearch id={`${createAt}`} />,
                              customData: {
                                type: "postSearch",
                                data: {
                                  nowPage: 1,
                                  pageCache: [],
                                  searchTags: [tag],
                                }
                              }
                            })
                          }}
                          draggable
                          onDragStart={(e) => {
                            dragItem(e, {
                              type: "tag",
                              data: {
                                action: "=",
                                tag: tag
                              }
                            })
                          }}
                        >{tag}</div>
                      </div>
                    </>)}
                  </div>
                </div>
            })}
      </div>
      <div className={style["Preview"]}>

        {(() => {
          switch (postData?.file.ext) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "webp":
              return <div className={style["Image"]}>
                <Viewer className={style["Viewer"]}>
                  <img src={postData?.file.url!} />
                </Viewer>
              </div>

            case "webm":
            case "mp4":
              return <div className={style["Video"]}>
                <video src={postData?.file.url!} controls loop muted />
              </div>

          }
        })()}

        <div className={style["Action"]}>

          <button
            kiase-style=""
            onClick={() => {
              open(postData?.file.url!)
            }}
          >{"View Raw"}</button>

          <button
            kiase-style=""
            onClick={() => {
              someActions.setAsWallpaper(userIndex, postData?.file.url!, postData)
            }}
            style={{ marginLeft: "auto" }}
          >{"Set as wallpaper"}</button>

          <button
            kiase-style=""
            draggable
            onDragStart={(e) => {
              if (thisWindow?.customData?.type === "post") {
                const { parentData } = thisWindow?.customData?.data
                if (parentData) {
                  dragItem(e, { type: "post", data: postData }, parentData.customData.data.searchTags)
                }
              } else {
                dragItem(e, { type: "post", data: postData })
              }
            }}
            onClick={() => {
              if (thisWindow?.customData?.type === "post") {
                const { parentData } = thisWindow?.customData?.data
                if (parentData) {
                  const q = parentData.customData.data.searchTags.join(" ")
                  open(`https://e621.net/posts/${postData?.id}?${makeQuery({ q })}`)
                }
              } else if (thisWindow?.customData?.type === "postGetByID") {
                open(`https://e621.net/posts/${postData?.id}`)
              }
            }}
          >{"Open With Browser"}</button>
        </div>

        <div className={style["Description"]}>
          {postData?.description.split("\n").map(e => <>{e}<br /></>)}
        </div>

      </div>
    </div>)
  }
}

const NODATA = {
  Fetching: function () {
    const [start, setStart] = useState<boolean>(false)

    const eRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      void eRef.current!.clientHeight
      setStart(true)
    }, [])

    const Cers = (<div className={style["Cers"]}>
      {
        [
          [400, 15, 6],
          [250, 12, 4],
          [100, 10, 2],
        ].map((e, i) => <div className={style["cer"]}>
          <div className={style["Scale"]}
            style={{
              transitionDelay: `${i * .2}s`
            }}>
            <div className={style["Mri"]}>
              <div className={style["C"]} style={{
                width: `${e[0]}px`,
                borderWidth: `${e[1]}px`,
                animationDuration: `${e[2]}s`
              }} />
            </div>
          </div>
        </div>)}

    </div>)

    return (<div ref={eRef} className={[style["Fetching"], start ? style["START"] : ""].join(" ")}>
      {Cers}
      <div className={style["Line"]}>
        {Cers}
        <div className={style["Fill"]}>
          {Cers}
        </div>
      </div>
    </div>)
  },
  None: function () {
    const [start, setStart] = useState<boolean>(false)

    const eRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      void eRef.current!.clientHeight
      setStart(true)
    }, [])

    return (<div ref={eRef} className={[style["None"], start ? style["START"] : ""].join(" ")}>
      <div className={style["Text"]}>
        {functions.htmlElement.splitToElement("NO DATA", (e, i) => <div key={i} className={style["case"]}>{e}</div>)}
      </div>
    </div>)
  },
}

const WINDOW_FRAME = ({
  menulist,
  className,
  children,
  onDrop,
  onDrag,
  onDragCapture,
  onDragEnd,
  onDragEndCapture,
  onDragEnter,
  onDragEnterCapture,
  onDragExit,
  onDragExitCapture,
  onDragLeave,
  onDragLeaveCapture,
  onDragOver,
  onDragOverCapture,
  onDragStart,
  onDragStartCapture,

}: WindowFrameProps) => {
  const [hasClick, setHasClick] = useState<boolean>(false)

  useEffect(() => {
    if (!hasClick) return

    const clickEvent = () => {
      setHasClick(false)
    }

    document.addEventListener("click", clickEvent)
    return () => {
      document.removeEventListener("click", clickEvent)
    }
  }, [hasClick])


  const onClickEvent = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, menu: MenuAction.Item[], frs?: boolean) => {
    event.stopPropagation()
    event.preventDefault()
    const btn = (event.target as HTMLButtonElement)
    const btnRect = btn.getBoundingClientRect()
    const x = btnRect.bottom
    const y = btnRect.left + (frs ? 20 : 0)
    MenuAction.showMenu(menu, [x, y], undefined, () => { setHasClick(false) })
  }

  return <>
    <div className={style["WindowFrame"]} >
      <div className={style["ButtonList"]}>
        <div className={style["text"]}>
          {menulist.map((btns, i) =>
            <button
              key={"btn_" + i}
              kiase-style=""

              onMouseEnter={(event) => {
                if (!hasClick) return
                onClickEvent(event, btns[1], i === 0)
              }}
              onMouseDown={(event) => {
                if (hasClick) { setHasClick(false); return; }
                event.stopPropagation();
                onClickEvent(event, btns[1], i === 0)
                setHasClick(true)
              }}
              onClick={(event) => {
                if (!hasClick) { setHasClick(false); return; }
                onClickEvent(event, btns[1], i === 0)
                setHasClick(true)
              }}

              style={{ zIndex: menulist.length - i }}
            >
              <div>{btns[0]}</div>
            </button>
          )}
        </div>
        <div className={style["background"]}>
          {menulist.map((btns, i) =>
            <button
              key={i}
              kiase-style=""
              style={{ zIndex: menulist.length - i }}
            >
              <div>{btns[0]}</div>
            </button>
          )}
        </div>
      </div>

      <div
        className={[style["MainContent"], className].join(" ")}
        onDrop={onDrop}
        onDrag={onDrag}
        onDragCapture={onDragCapture}
        onDragEnd={onDragEnd}
        onDragEndCapture={onDragEndCapture}
        onDragEnter={onDragEnter}
        onDragEnterCapture={onDragEnterCapture}
        onDragExit={onDragExit}
        onDragExitCapture={onDragExitCapture}
        onDragLeave={onDragLeave}
        onDragLeaveCapture={onDragLeaveCapture}
        onDragOver={onDragOver}
        onDragOverCapture={onDragOverCapture}
        onDragStart={onDragStart}
        onDragStartCapture={onDragStartCapture}
      >
        {children}
      </div>
    </div>
  </>
}

type windowProp = { id: string }

export namespace windowsComponent {
  export namespace setting {

  }
}

const windowAction: (windowID: string, other?: MenuAction.Item[]) => MenuButtonType = (windowID, other) => [
  "Window",
  [
    ...other ?? [],
    [
      "Minimize",
      () => { wmRef.current?.minimizeWindow(windowID) }
    ],
    [
      "Close",
      () => { wmRef.current?.closeWindow(windowID) }
    ]
  ],
]

const windowsType = {
  postSearch: function ({ id }: windowProp) {

    const windowID = `post_search-${id}`
    const thisWindow = wmRef.current?.getWindow(windowID)!

    const savedData = thisWindow?.customData?.type === "postSearch"
      ? thisWindow.customData.data
      : undefined;

    const [page, setPage] = useState<number>(savedData?.nowPage ?? 1);
    const [searchTags, setSearchTags] = useState<string[]>(savedData?.searchTags ?? ["yonkagor", "webm"]);
    const [searchTagsInput, setSearchTagsInput] = useState<string[]>(searchTags);
    const [searchRating, setSearchRating] = useState<string[]>(["rating:s"]);

    const [postsCache, setPostsCache] = useState<PostsCache>(savedData?.pageCache ?? {});
    const [jupToPage, setJupToPage] = useState<boolean>(false);
    const [jupPage, setJupPage] = useState<number>(1);

    const [isFocuOnIt, setFocuOnIt] = useState<boolean>(false);

    const currentPosts = useMemo(() => postsCache[page] || [], [postsCache, page]);

    const fetchingPages = useRef<Set<number>>(new Set());

    const scrollPage = useRef<HTMLDivElement>(null);

    const fetchPageData = useCallback(async (targetPage: number) => {
      if (postsCache[targetPage] || fetchingPages.current.has(targetPage)) {
        return;
      }

      fetchingPages.current.add(targetPage);

      try {
        Kiasole.log(`[背景預取] 正在請求 API: 第 ${targetPage} 頁`);
        const newPosts = await LABS_E621_API.posts.search({
          tags: [...searchTags, ...searchRating],
          page: targetPage,
          limit: 75,
          user: (workSpaceStatus.userList[userIndex].saveInfo.user.e621 ? {
            name: workSpaceStatus.userList[userIndex].saveInfo.user.e621?.name!,
            key: workSpaceStatus.userList[userIndex].saveInfo.user.e621?.key!,
          } : undefined)
        });

        setPostsCache((prev) => ({
          ...prev,
          [targetPage]: newPosts
        }));

      } catch (err) {
        Kiasole.error(`第 ${targetPage} 頁抓取失敗 :` + err);
      } finally {
        fetchingPages.current.delete(targetPage);
      }
    }, [searchTags, searchRating, postsCache]);

    useEffect(() => {
      const savedCache = thisWindow?.customData?.type === "postSearch"
        ? thisWindow.customData.data?.pageCache
        : null;

      if (savedCache && Object.keys(savedCache).length > 0) {
        setPostsCache(savedCache);
      }
    }, []);

    useEffect(() => {
      if (thisWindow.customData?.type === "postSearch") {
        thisWindow?.setData({
          type: "postSearch",
          data: {
            nowPage: page,
            pageCache: postsCache,
            searchTags: searchTags,
          }
        });
      }
    }, [page, postsCache, searchTags]);

    useEffect(() => {
      thisWindow?.setTitle(`Post Search [ ${searchTags.join(",")} ]`,)
    }, [searchTags])

    useEffect(() => {
      const loadData = async () => {
        const targetPages = [page, page + 1, page - 1, page + 2, page - 2]
          .filter(p => p > 0);

        for (const p of targetPages) {
          await fetchPageData(p);
          await functions.timeSleep(500);
        }
      };

      loadData();
    }, [page, searchTags]);

    useEffect(() => {
      const { current: scpg } = scrollPage
      if (scpg) {
        scpg.scrollTo({ top: 0 })
      }
    }, [page])

    const refreshSearch = useCallback((newTags?: string[]) => {
      setPostsCache({});

      setPage(1);

      if (newTags) {
        setSearchTags(newTags);
      }
    }, []);

    useEffect(() => {
      const keydown = (e: KeyboardEvent) => {
        if (!wmRef.current?.getWindow(thisWindow.id)?.isFocused) return;

        switch (e.code) {
          case "Escape": {
            setJupToPage(false)
            break
          }
        }

        if (jupToPage || isFocuOnIt) return;

        switch (e.code) {
          case "ArrowLeft": {
            e.preventDefault()
            setPage(e => e > 1 ? e - 1 : 1)
            break
          }
          case "ArrowRight": {
            e.preventDefault()
            setPage(e => e + 1)
            break
          }
        }
      }
      document.addEventListener("keydown", keydown)

      return () => {
        document.removeEventListener("keydown", keydown)
      }

    }, [jupToPage, isFocuOnIt])

    const actionMenu = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, post: E621.Post) => {
      event.stopPropagation()
      event.preventDefault()
      const btn = event.currentTarget
      const btnRect = btn.getBoundingClientRect()
      const x = btnRect.bottom
      const y = btnRect.left
      MenuAction.showMenu([
        [
          "Open With Browser",
          () => {
            const q = searchTags.join(" ")
            open(`https://e621.net/posts/${post.id}?${makeQuery({ q })}`)
          }
        ],
        [
          "Open With Viewer",
          () => {
            someActions.openWithViewer(post)
          }
        ],
        [
          "Open With Get by ID",
          () => {
            someActions.openWithGetByID(post)
          }
        ],
        [
          "Save To Tmp",
          () => {
            someActions.saveToTmp(userIndex, {
              type: "postGetByID",
              data: {
                currentId: post.id,
                status: "success",
                fetchedPost: post
              }
            }, `Post Get By ID [ ${post.id} ]`, `post_get_by_id-${post.id}`)
          },
          {
            type: "post",
            data: post
          }
        ],
        [
          "Copy ID",
          () => {
            navigator.clipboard.writeText(post.id.toString())
          }
        ],
        [
          "Set as wallpaper",
          () => {
            someActions.setAsWallpaper(userIndex, post.file.url!, post)
          }
        ],
      ], [x, y])
    }

    const handleNextPage = () => setPage(p => p + 1);
    const handlePrevPage = () => setPage(p => Math.max(1, p - 1));

    const showLoading = !postsCache[page];

    useEffect(() => {
      const statusOffset = 50
      const offset = 200

      let startPointX = 0
      let startPointY = 0

      let status: "NONE" | "X" | "Y" = "NONE"

      let x = 0
      let y = 0

      const touchArea = scrollPage.current

      if (jupToPage) return;

      const onTouchStart = (e: TouchEvent) => {
        if (!touchArea) return;

        startPointX = e.touches[0].clientX
        startPointY = e.touches[0].clientY
      }

      const onTouchMove = (e: TouchEvent) => {
        if (!touchArea) return;

        x = startPointX - e.touches[0].clientX
        y = startPointY - e.touches[0].clientY

        if (status === "X") e.preventDefault();

        if (status === "Y") { x = 0; return; }

        const transform = () => {
          touchArea.style.transform = `translateX(${-1 * (x / 10)}px)`
        }

        if (x > offset) {
          touchArea.style.opacity = ".5"
          transform()
        } else if (x < -offset) {
          if (page === 1) return;
          touchArea.style.opacity = ".5"
          transform()
        } else {
          touchArea.style.opacity = ""
          transform()
        }

        if (status !== "NONE") return;
        if (x > statusOffset || x < -statusOffset) status = "X";
        if (y > statusOffset || y < -statusOffset) status = "Y";
      }

      const onTouchEnd = () => {
        if (!touchArea) return;

        startPointX = 0;

        if (x > offset) {
          setPage(e => e + 1)
          void touchArea.clientHeight
        } else if (x < -offset) {
          setPage(e => e > 1 ? e - 1 : 1)
          void touchArea.clientHeight
        }
        touchArea.style.transform = ""
        touchArea.style.opacity = ""

        status = "NONE"
      }

      touchArea?.addEventListener("touchstart", onTouchStart)
      touchArea?.addEventListener("touchmove", onTouchMove)
      touchArea?.addEventListener("touchend", onTouchEnd)

      return () => {
        touchArea?.removeEventListener("touchstart", onTouchStart)
        touchArea?.removeEventListener("touchmove", onTouchMove)
        touchArea?.removeEventListener("touchend", onTouchEnd)
      }

    }, [jupToPage, page, scrollPage.current])

    const Layer = {
      PaginationControls: <div className={style["PaginationControls"]} >
        <div />
        <div className={style["InnerFrame"]}>
          <button kiase-style="" onClick={handlePrevPage} disabled={page === 1}>{"<"}</button>
          <button kiase-style="" onClick={() => { setJupToPage(true); setJupPage(page) }} >Page {page}</button>
          <button kiase-style="" onClick={handleNextPage}>{">"}</button>
        </div>
      </div>,

      TagEditor: <div className={style["TagEditor"]} >
        <div className={style["InnerFrame"]}>
          <input
            type="text"
            value={searchTagsInput.join(" ")}
            onInput={(e) => setSearchTagsInput(e.currentTarget.value.split(" "))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.code === "NumpadEnter") {
                if (searchTagsInput.join(" ") === searchTags.join(" ")) return;
                refreshSearch(searchTagsInput);
              }
            }}
            onFocus={() => { setFocuOnIt(true) }}
            onBlur={() => { setFocuOnIt(false) }}
          />
        </div>
        <div />
      </div>,
    }

    const JumpToPageOverlay = useMemo(() => {
      const _ = ({
        jupToPage,
        jupPage,
        setJupPage,
        setJupToPage,
        setPage
      }: {
        jupToPage: boolean,
        jupPage: number,
        setJupPage: (p: number) => void,
        setJupToPage: (b: boolean) => void,
        setPage: (p: number | ((prev: number) => number)) => void
      }) => {
        const touchAreaRef = useRef<HTMLDivElement>(null);
        const backButtonRef = useRef<HTMLButtonElement>(null);
        const backLineRef = useRef<HTMLDivElement>(null);
        const applyButtonRef = useRef<HTMLButtonElement>(null);
        const applyLineRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
          const offset = 200

          let startPointX = 0
          let x = 0

          const touchArea = touchAreaRef.current
          const backButton = backButtonRef.current
          const backLine = backLineRef.current
          const applyButton = applyButtonRef.current
          const applyLine = applyLineRef.current

          const isLoad = touchArea && backButton && backLine && applyButton && applyLine

          if (!isLoad) return;
          if (!jupToPage) return;

          const onTouchStart = (e: TouchEvent) => {
            startPointX = e.touches[0].clientX
          }

          const onTouchMove = (e: TouchEvent) => {
            x = startPointX - e.touches[0].clientX

            const _x = x / 7

            if (x > 0) {
              applyButton.style.transform = ""
              applyLine.style.transform = ""

              backButton.style.transform = `translateX(-${_x}px)`
              backLine.style.transform = `translateX(-${_x}px)`
            } else {
              backButton.style.transform = ""
              backLine.style.transform = ""

              applyButton.style.transform = `translateX(${Math.abs(_x)}px)`
              applyLine.style.transform = `translateX(${_x}px)`
            }

            if (x > offset) {
              applyButton.style.opacity = ""
              applyLine.style.opacity = ""
              backButton.style.opacity = ".5"
              backLine.style.opacity = ".5"
            } else if (x < -offset) {
              backButton.style.opacity = ""
              backLine.style.opacity = ""
              applyButton.style.opacity = ".5"
              applyLine.style.opacity = ".5"
            } else {
              backButton.style.opacity = ""
              backLine.style.opacity = ""
              applyButton.style.opacity = ""
              applyLine.style.opacity = ""
            }

          }

          const onTouchEnd = (e: TouchEvent) => {
            startPointX = 0

            if (x > offset) {
              setJupToPage(false)
              backButton.click()
            } else if (x < -offset) {
              setJupToPage(false)
              applyButton.click()
            }

            backButton.style.transform = ""
            backLine.style.transform = ""
            applyButton.style.transform = ""
            applyLine.style.transform = ""
            backButton.style.opacity = ""
            backLine.style.opacity = ""
            applyButton.style.opacity = ""
            applyLine.style.opacity = ""
          }

          touchArea.addEventListener("touchstart", onTouchStart)
          touchArea.addEventListener("touchmove", onTouchMove)
          touchArea.addEventListener("touchend", onTouchEnd)

          return () => {
            touchArea.removeEventListener("touchstart", onTouchStart)
            touchArea.removeEventListener("touchmove", onTouchMove)
            touchArea.removeEventListener("touchend", onTouchEnd)
          }

        }, [jupToPage, jupPage, setJupToPage, setPage]);

        useEffect(() => {
          const input = inputRef.current
          if (!input) return;
          if (jupToPage) input.focus();
          else input.blur()
        }, [jupToPage]);

        return (
          <div ref={touchAreaRef} className={[style["JumpToPage"], jupToPage && style["show"]].join(" ")}>
            <div className={style["Inner"]}>
              <div className={style["Back"]}>
                <button ref={backButtonRef} onClick={() => setJupToPage(false)}>{"<-- Cancel"}</button>
              </div>
              <div className={[style["line"], style["top"]].join(" ")}><div ref={backLineRef} /></div>
              <div className={style["Input"]}>
                Jump To Page
                <input
                  ref={inputRef}
                  type="number"
                  value={jupPage}
                  onChange={(e) => setJupPage(+e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(~~(jupPage || 1));
                      setJupToPage(false);
                    }
                  }}
                />
              </div>
              <div className={[style["line"], style["bottom"]].join(" ")}><div ref={applyLineRef} /></div>
              <div className={style["Apply"]}>
                <button ref={applyButtonRef} onClick={() => {
                  setPage(~~(jupPage || 1));
                  setJupToPage(false);
                }}>{"Apply -->"}</button>
              </div>
            </div>
          </div>
        );
      };

      return _
    }, [])

    return (
      <>
        <WINDOW_FRAME
          className={style["postSearch"]}
          menulist={[
            windowAction(windowID, [
              [
                "Clone",
                () => {
                  const createAt = new Date().getTime()

                  wmRef.current?.createWindow({
                    id: `post_search-${createAt}`,
                    title: `Post Search [ ${createAt} ]`,
                    children: <windowsType.postSearch id={`${createAt}`} />,
                    customData: thisWindow?.customData
                  })
                }
              ]
            ]),

            [
              "Data",
              [
                [
                  "Reload",
                  () => refreshSearch()
                ],
              ],
            ],
            [
              "Other",
              [
                [
                  "Save to Tmp",
                  () => {
                    someActions.saveToTmp(userIndex, cloneDeep(wmRef.current!.getWindow(thisWindow.id!)!.customData!), thisWindow.title, windowID)
                  },
                  thisWindow.customData?.type === "postSearch" ? {
                    type: "postSearch",
                    thisWindow,
                    data: thisWindow.customData.data
                  } : undefined
                ],
              ],
            ],
          ]}

          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={e => {
            if (!e.dataTransfer) return;

            const itemdata = e.dataTransfer.getData(e621Type.DragItemType.appname)

            if (itemdata) {
              const item: e621Type.DragItemType.defaul = JSON.parse(itemdata)
              const { data, type } = item
              if (type === "tag") {
                let newTags = [...searchTagsInput];
                switch (data.action) {
                  case "+": {
                    if (newTags.some(e => e === "-" + data.tag)) {
                      newTags = newTags.filter(e => e !== "-" + data.tag)
                    } else if (!newTags.some(e => e === data.tag)) {
                      newTags.push(data.tag)
                    }
                    StopEvent(e)
                    break;
                  }
                  case "-": {
                    if (newTags.some(e => e === data.tag)) {
                      newTags = newTags.filter(e => e !== data.tag)
                    } else if (!newTags.some(e => e === "-" + data.tag)) {
                      newTags.push("-" + data.tag)
                    }
                    StopEvent(e)
                    break;
                  }
                }
                setSearchTagsInput(newTags)
              }
            }
          }}
        >
          {Layer.PaginationControls}
          {Layer.TagEditor}

          <JumpToPageOverlay
            jupToPage={jupToPage}
            jupPage={jupPage}
            setJupPage={setJupPage}
            setJupToPage={setJupToPage}
            setPage={setPage}
          />

          <div className={style["List"]}>
            {showLoading && <NODATA.Fetching />}
            {!showLoading &&
              <div className={style["InnerFrame"]} ref={scrollPage}>

                {currentPosts.map((post, indx) => <Components.Card
                  actionMenu={actionMenu}
                  key={post.id}
                  post={post}
                  delay={indx * .005}
                  q={{ q: searchTags.join(" ") }}
                  onClick={() => {
                    const winID = `post-${id}`
                    const title = `Post / ${post.tags.artist.join(",")} - ${post.id}`;
                    const children = <windowsType.post key={post.id} id={id} />;
                    const customData: e621Type.window.post = {
                      type: "post",
                      data: {
                        postId: post.id,
                        cachedPost: post,
                        parentData: {
                          windowID,
                          title: thisWindow?.title!,
                          componentType: "postSearch",
                          rect: thisWindow?.rect!,
                          customData: {
                            type: "postSearch",
                            data: {
                              nowPage: page,
                              pageCache: postsCache,
                              searchTags,
                            }
                          }
                        }
                      }
                    }
                    if (!wmRef.current?.hasWindowID(winID)) {
                      wmRef.current?.createWindow({
                        id: winID,
                        title,
                        children,
                        customData,
                      })
                    } else {
                      wmRef.current.updateWindow(winID, {
                        title,
                        children,
                        customData,
                      })
                      wmRef.current.bringToFront(winID)
                    }
                  }}
                />)}

              </div>
            }
            {!showLoading && currentPosts.length === 0 && <NODATA.None />}
          </div>

          <div className={style["BackgroundMask"]}>
            {Layer.PaginationControls}
            {Layer.TagEditor}
          </div>

        </WINDOW_FRAME>
      </>
    );
  },
  post: function ({ id }: windowProp) {
    const windowID = `post-${id}`
    const thisWindow = wmRef.current?.getWindow(windowID)

    const savedData = thisWindow?.customData?.type === "post"
      ? thisWindow.customData.data
      : undefined;

    const [postId] = useState<number>(savedData?.postId ?? 0);
    const [postData, setPostData] = useState<E621.Post | undefined>(savedData?.cachedPost);
    const [isLoading, setIsLoading] = useState<boolean>(!savedData?.cachedPost);

    const fetchPost = useCallback(async () => {
      if (!postId) return;
      setIsLoading(true);
      setPostData(undefined)
      try {
        const result = await LABS_E621_API.posts.get({
          id: postId,
          user: (workSpaceStatus.userList[userIndex].saveInfo.user.e621 ? {
            name: workSpaceStatus.userList[userIndex].saveInfo.user.e621?.name!,
            key: workSpaceStatus.userList[userIndex].saveInfo.user.e621?.key!,
          } : undefined)
        });
        if (result) {
          setPostData(result);
        }
      } catch (e) {
        Kiasole.error(`Post ${postId} load failed: ${e}`);
      } finally {
        setIsLoading(false);
      }
    }, [postId]);

    useEffect(() => {
      if (!postData && postId !== 0) {
        fetchPost();
      }
    }, [postId]);

    useEffect(() => {
      thisWindow?.setData({
        type: "post",
        data: {
          postId,
          cachedPost: postData,
          parentData: savedData?.parentData
        }
      });
    }, [postData, postId]);

    return (
      <>
        <WINDOW_FRAME
          menulist={[
            windowAction(windowID, [
              [
                "Restore Parent Window",
                () => {
                  if (thisWindow?.customData?.type === "post") {
                    const { parentData } = thisWindow?.customData?.data
                    if (parentData) {
                      const { rect, windowID, customData, componentType } = parentData

                      let reconstructedChildren: ReactNode = null;

                      if (componentType === "postSearch") {
                        const parentId = windowID.replace("post_search-", "");
                        reconstructedChildren = <windowsType.postSearch id={parentId} />;
                      }

                      if (wmRef.current?.getWindow(windowID)) {
                        wmRef.current.bringToFront(windowID)
                      } else {
                        wmRef.current?.createWindow({
                          id: windowID,
                          title: parentData.title,
                          rect,
                          children: reconstructedChildren,
                          customData: customData
                        })
                      }
                    }
                  }
                }
              ]
            ]),
            [
              "Data",
              [
                [
                  "Reload",
                  () => {
                    fetchPost()
                  }
                ],
              ],
            ],
            [
              "Other",
              [
                [
                  "Set as wallpaper",
                  () => {
                    someActions.setAsWallpaper(userIndex, postData?.file.url!, postData)
                  }
                ],
                [
                  "Open With Get by ID",
                  () => {
                    if (postData)
                      someActions.openWithGetByID(postData)
                  }
                ],
                [
                  "Open With Browser",
                  () => {
                    if (thisWindow?.customData?.type === "post") {
                      const { parentData } = thisWindow?.customData?.data
                      if (parentData) {
                        const q = parentData.customData.data.searchTags.join(" ")
                        open(`https://e621.net/posts/${postData?.id}?${makeQuery({ q })}`)
                      }
                    }
                  }
                ],
                [
                  "Open With Viewer",
                  () => {
                    if (postData)
                      someActions.openWithViewer(postData)
                  }
                ],
                [
                  "Copy ID",
                  () => {
                    someActions.writeToClipboard(postData?.id.toString()!)
                  }
                ],
                [
                  "Save To Tmp",
                  () => {
                    if (postData)
                      someActions.saveToTmp(userIndex, {
                        type: "postGetByID",
                        data: {
                          currentId: postData.id,
                          status: "success",
                          fetchedPost: postData
                        }
                      }, `Post Get By ID [ ${postData.id} ]`, `post_get_by_id-${postData.id}`)
                  },
                  postData ? {
                    type: "post",
                    data: postData
                  } : undefined
                ],
              ],
            ],

          ]}
        >
          {postData &&
            <Components.Post postData={postData} thisWindow={thisWindow} />
          }
          {!postData && <NODATA.Fetching />}
        </WINDOW_FRAME >
      </>
    );
  },
  postGetByID: function ({ id }: windowProp) {
    const windowID = `post_get_by_id-${id}`;
    const thisWindow = wmRef.current?.getWindow(windowID);

    const savedData = thisWindow?.customData?.type === "postGetByID"
      ? thisWindow.customData.data
      : undefined;

    const [inputId, setInputId] = useState<string | number>(savedData?.currentId ?? "");
    const [fetchedPost, setFetchedPost] = useState<E621.Post | null | undefined>(savedData?.fetchedPost);
    const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(savedData?.status ?? "idle");

    const handleSearch = async (nextId: string | number) => {
      const targetId = Number(nextId);
      if (isNaN(targetId) || targetId <= 0) {
        Kiasole.error("Invalid ID");
        return;
      }

      const targetWindowID = `post_get_by_id-${targetId}`;

      if (targetWindowID !== windowID && wmRef.current?.hasWindowID(targetWindowID)) {
        Kiasole.log(`Window ${targetWindowID} already exists. Focusing...`);
        wmRef.current.bringToFront(targetWindowID);
        return;
      }

      setStatus("loading");
      setFetchedPost(undefined);

      try {
        const result = await LABS_E621_API.posts.get({
          id: targetId,
          user: (workSpaceStatus.userList[userIndex].saveInfo.user.e621 ? {
            name: workSpaceStatus.userList[userIndex].saveInfo.user.e621?.name!,
            key: workSpaceStatus.userList[userIndex].saveInfo.user.e621?.key!,
          } : undefined)
        });

        if (result) {
          setFetchedPost(result);
          setStatus("success");
          thisWindow?.setTitle(`Post Get By ID [ ${targetId} ]`);


          if (targetWindowID !== windowID) {
            thisWindow?.setData({
              type: "postGetByID",
              data: {
                currentId: targetId,
                fetchedPost: result,
                status: "success"
              }
            });

            const success = wmRef.current?.updateWindowID(windowID, targetWindowID);

            if (success) {
              wmRef.current?.updateWindow(targetWindowID, {
                children: <windowsType.postGetByID id={targetId.toString()} />
              });
            }
          }

        } else {
          setFetchedPost(null);
          setStatus("error");
        }
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    };

    useEffect(() => {
      thisWindow?.setData({
        type: "postGetByID",
        data: {
          currentId: inputId,
          fetchedPost: fetchedPost,
          status: status
        }
      });
    }, [inputId, fetchedPost, status]);

    useEffect(() => {
      if (status === "loading" && !fetchedPost) {
        handleSearch(inputId);
      }
    }, []);

    return (
      <WINDOW_FRAME
        menulist={[
          windowAction(windowID),
          [
            "Data",
            [
              [
                "Reload",
                () => {
                  handleSearch(inputId)
                }
              ],
            ],
          ],
          [
            "Other",
            [
              [
                "Set as wallpaper",
                () => {
                  if (fetchedPost) {
                    someActions.setAsWallpaper(userIndex, fetchedPost?.file.url!, fetchedPost)
                  }
                }
              ],
              [
                "Open With Browser",
                () => {
                  if (fetchedPost)
                    open(`https://e621.net/posts/${fetchedPost.id}`)

                }
              ],
              [
                "Open With Viewer",
                () => {
                  if (fetchedPost)
                    someActions.openWithViewer(fetchedPost!)
                }
              ],
              [
                "Save To Tmp",
                () => {
                  if (fetchedPost)
                    someActions.saveToTmp(userIndex, {
                      type: "postGetByID",
                      data: {
                        currentId: fetchedPost.id,
                        status: "success",
                        fetchedPost: fetchedPost
                      }
                    }, `Post Get By ID [ ${fetchedPost.id} ]`, `post_get_by_id-${fetchedPost.id}`)
                },
                fetchedPost ? {
                  type: "post",
                  data: fetchedPost
                } : undefined
              ],
              [
                "Copy ID",
                () => {
                  someActions.writeToClipboard(fetchedPost?.id.toString()!)
                }
              ],
            ],
          ],
        ]}
      >
        <div className={style["postGetByID"]}>
          <div className={style["Input"]}>
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.code === "NumpadEnter") {
                  handleSearch(e.currentTarget.value);
                }
              }}
              placeholder="Input Post ID..."
            />
          </div>
          {fetchedPost &&
            <Components.Post key={fetchedPost.id} postData={fetchedPost} thisWindow={thisWindow} />
          }
          {!fetchedPost && <NODATA.Fetching />}
        </div>
      </WINDOW_FRAME >
    );
  },
  viewer: function ({ id }: windowProp) {
    const windowID = `viewer-${id}`;
    const thisWindow = wmRef.current?.getWindow(windowID);

    const savedData = thisWindow?.customData?.type === "viewer"
      ? thisWindow.customData.data
      : undefined;

    const [fetchedPost, setFetchedPost] = useState<E621.Post>(savedData!);

    return (
      <WINDOW_FRAME
        menulist={[
          windowAction(windowID, [
            [
              "Restore Parent Window",
              () => {
                if (thisWindow?.customData?.type === "post") {
                  const { parentData } = thisWindow?.customData?.data
                  if (parentData) {
                    const { rect, windowID, customData, componentType } = parentData

                    let reconstructedChildren: ReactNode = null;

                    if (componentType === "postSearch") {
                      const parentId = windowID.replace("post_search-", "");
                      reconstructedChildren = <windowsType.postSearch id={parentId} />;
                    }

                    if (wmRef.current?.getWindow(windowID)) {
                      wmRef.current.bringToFront(windowID)
                    } else {
                      wmRef.current?.createWindow({
                        id: windowID,
                        title: parentData.title,
                        rect,
                        children: reconstructedChildren,
                        customData: customData
                      })
                    }
                  }
                }
              }
            ],
          ]),
          [
            "Other",
            [
              [
                "Set as wallpaper",
                () => {
                  if (fetchedPost) {
                    someActions.setAsWallpaper(userIndex, fetchedPost?.file.url!, fetchedPost)
                  }
                }
              ],
              [
                "Open With Browser",
                () => {
                  if (thisWindow?.customData?.type === "post") {
                    const { parentData } = thisWindow?.customData?.data
                    if (parentData) {
                      const q = parentData.customData.data.searchTags.join(" ")
                      open(`https://e621.net/posts/${fetchedPost?.id}?${makeQuery({ q })}`)
                    }
                  }
                }
              ],
              [
                "Save To Tmp",
                () => {
                  if (fetchedPost)
                    someActions.saveToTmp(userIndex, {
                      type: "postGetByID",
                      data: {
                        currentId: fetchedPost.id,
                        status: "success",
                        fetchedPost: fetchedPost
                      }
                    }, `Post Get By ID [ ${fetchedPost.id} ]`, `post_get_by_id-${fetchedPost.id}`)
                },
                fetchedPost ? {
                  type: "post",
                  data: fetchedPost
                } : undefined
              ],
              [
                "Copy ID",
                () => {
                  someActions.writeToClipboard(fetchedPost?.id.toString()!)
                }
              ],
            ],
          ],
        ]}
      >
        <Viewer className={style["Viewer"]}>
          <img src={fetchedPost.file.url!} alt="" />
        </Viewer>
      </WINDOW_FRAME >
    );
  },
  pool: function ({ id }: windowProp) {
    const windowID = `pool-${id}`;
    const thisWindow = wmRef.current?.getWindow(windowID);

    const savedData = thisWindow?.customData?.type === "pool"
      ? thisWindow.customData.data
      : undefined;

    const [poolId] = useState<number>(savedData?.poolId || 0);
    const [poolInfo, setPoolInfo] = useState<E621.Pool | undefined>(savedData?.poolInfo);

    const [page, setPage] = useState<number>(savedData?.nowPage ?? 1);
    const [postsCache, setPostsCache] = useState<PostsCache>(savedData?.pageCache ?? {});
    const fetchingPages = useRef<Set<number>>(new Set());

    const currentPosts = useMemo(() => postsCache[page] || [], [postsCache, page]);

    useEffect(() => {
      if (!poolInfo && poolId !== 0) {
        LABS_E621_API.pools.get({ id: poolId }).then(info => {
          if (info) setPoolInfo(info as any);
        }).catch(err => Kiasole.error(`Pool Info Fetch Error: ${err}`));
      }
    }, [poolId]);

    const fetchPageData = useCallback(async (targetPage: number) => {
      if (postsCache[targetPage] || fetchingPages.current.has(targetPage) || !poolId) {
        return;
      }

      fetchingPages.current.add(targetPage);
      try {
        const newPosts = await LABS_E621_API.posts.search({
          tags: [`pool:${poolId}`],
          page: targetPage,
          limit: 50
        });

        setPostsCache((prev) => ({
          ...prev,
          [targetPage]: newPosts
        }));
      } catch (err) {
        Kiasole.error(`Pool page ${targetPage} fetch failed: ${err}`);
      } finally {
        fetchingPages.current.delete(targetPage);
      }
    }, [postsCache, poolId]);

    useEffect(() => {
      fetchPageData(page);
      fetchPageData(page + 1);
    }, [page, poolId, fetchPageData]);

    useEffect(() => {
      thisWindow?.setData({
        type: "pool",
        data: {
          poolId,
          poolInfo,
          nowPage: page,
          pageCache: postsCache,
        }
      });

      if (poolInfo) {
        thisWindow?.setTitle(`Pool: ${poolInfo.name.replace(/_/g, " ")} [Page ${page}]`);
      } else {
        thisWindow?.setTitle(`Pool: ${poolId}`);
      }
    }, [page, postsCache, poolInfo, poolId]);

    const handleNextPage = () => setPage(p => p + 1);
    const handlePrevPage = () => setPage(p => Math.max(1, p - 1));

    // TODO: 請在此處實作 UI
    // 變數可用: poolInfo (Meta), currentPosts (List), page, handleNextPage, handlePrevPage
    return (
      <>
        {/* UI 邏輯與 postSearch 高度相似，但上方可以多顯示 poolInfo.description */}
      </>
    );
  },
  setting: function () {
    const windowID = `app-setting`;
    const thisWindow = wmRef.current?.getWindow(windowID)!;

    const { settingTabs } = e621Type.window.dataType
    const [nowPage, setNowPage] = useState<e621Type.window.dataType.settingTabs._All>("NONE")
    const [showIndex, setShowIndex] = useState<boolean>(false)

    useEffect(() => {
      if (thisWindow.customData?.type === "setting")
        setNowPage(thisWindow.customData.data)
    }, []);

    useEffect(() => {
      thisWindow?.setData({
        type: "setting",
        data: nowPage
      });

      thisWindow?.setTitle(nowPage === "NONE" ? "App Setting" : functions.str.capitalizeWords(`Setting / ${nowPage.categorie} > ${nowPage.pages}`));
    }, [nowPage]);

    useEffect(() => {
      const isFocus = () => !wmRef.current?.getWindow(thisWindow.id)?.isFocused && nowPage === "NONE";

      const keydown = (e: KeyboardEvent) => {
        if (isFocus()) return;
        if (e.altKey) {
          setShowIndex(true)
          e.preventDefault();
        };
        if (e.code.startsWith("Digit")) {
          const index = +`${e.code.slice(5)}` - 1
          setNowPage(e => {

            const newCart = settingTabs.categorieList[index]

            if (!newCart) return e

            setShowIndex(false)

            return {
              categorie: newCart,
              pages: settingTabs.pageList[newCart][0] as any
            }
          })
        }
      }

      const keyup = (e: KeyboardEvent) => {
        if (!e.altKey) {
          setShowIndex(false)
          e.preventDefault();
        };
      }

      document.addEventListener("keydown", keydown)
      document.addEventListener("keyup", keyup)

      return () => {
        document.removeEventListener("keydown", keydown)
        document.removeEventListener("keyup", keyup)
      }

    }, [nowPage])

    type PageBtn = {
      nowPage: e621Type.window.dataType.settingTabs._All;
    };

    type Page = {
      children?: JSX.Element,
    };

    const Page = useCallback(({ children }: Page) => {
      const [start, setStart] = useState<boolean>(false)

      const eRef = useRef<HTMLDivElement>(null)

      useEffect(() => {
        void eRef.current!.clientHeight
        setStart(true)
      }, [])

      return <div ref={eRef} className={[style["page"], start && style["START"]].join(" ")}>
        <div>
          {children}
        </div>
      </div>
    }, []);

    const PageButtonsList = useCallback(({ nowPage }: PageBtn) => {
      const [start, setStart] = useState<boolean>(false)
      const [backing, setBacking] = useState<boolean>(false)

      const eRef = useRef<HTMLDivElement>(null)

      useEffect(() => {
        void eRef.current!.clientHeight
        setStart(true)
      }, [])

      useEffect(() => {
        let animationId: NodeJS.Timeout
        let keyispress = false

        const isFocus = () => !wmRef.current?.getWindow(thisWindow.id)?.isFocused;

        const keydown = (e: KeyboardEvent) => {
          if (isFocus()) return;
          if (keyispress) return;

          if (e.shiftKey) {
            if (e.altKey) {

              const changePage = (offset: number) => {
                e.preventDefault();
                setNowPage(e => {
                  const _ = cloneDeep(e)
                  if (_ === "NONE") return _;

                  const list = settingTabs.categorieList;

                  let nowtar = list.indexOf(_.categorie);
                  let count = list.length;

                  nowtar += offset; nowtar = (nowtar % count + count) % count;

                  _.categorie = list[nowtar];
                  _.pages = settingTabs.pageList[_.categorie][0] as any

                  return _
                })
              }

              const changeTab = (offset: number) => {
                e.preventDefault();
                setNowPage(e => {
                  const _ = cloneDeep(e)
                  if (_ === "NONE") return _;

                  const list = settingTabs.pageList[_.categorie];

                  let nowtar = list.indexOf(_.pages);
                  let count = list.length;

                  nowtar += offset; nowtar = (nowtar % count + count) % count;

                  _.pages = list[nowtar] as any;

                  return _
                })
              }

              switch (e.code) {
                case "ArrowLeft": {
                  changePage(-1)
                  break;
                }
                case "ArrowRight": {
                  changePage(1)
                  break;
                }
                case "ArrowUp": {
                  changeTab(-1)
                  break;
                }
                case "ArrowDown": {
                  changeTab(1)
                  break;
                }
              }

              return;
            }
            return;
          }

          keyispress = true

          switch (e.code) {
            case "Escape": {
              setBacking(true)
              animationId = setTimeout(() => {
                setNowPage("NONE")
                setBacking(false)
              }, .5e3)
              break
            }
          }

        }

        const keyup = (e: KeyboardEvent) => {
          if (isFocus()) return;
          keyispress = false

          switch (e.code) {
            case "Escape": {
              clearTimeout(animationId);
              setBacking(false)
            }
          }
        }

        document.addEventListener("keydown", keydown)
        document.addEventListener("keyup", keyup)

        return () => {
          document.removeEventListener("keydown", keydown)
          document.removeEventListener("keyup", keyup)
        }

      }, [])

      if (nowPage === "NONE") return;

      return <div className={[style["list"], start && style["START"]].join(" ")} ref={eRef}>
        <div
          className={[style["buttonFrame"], style["frist"], backing && style["backing"]].join(" ")}
        >
          <button onClick={() => setNowPage("NONE")}>
            {"<- Back"}
          </button>
          <div className={style["backMask"]}>
            {"<- Back"}
          </div>
        </div>

        {settingTabs.pageList[nowPage.categorie].map((e, i) =>
          <div
            className={style["buttonFrame"]}
            style={{
              transitionDelay: `${i * .05 + .05}s`
            }}
          >
            <button
              className={[nowPage.pages === e && style["activ"]].join(" ")}
              key={i}
              onClick={() => setNowPage({ categorie: nowPage.categorie, pages: e as any })}
            >
              {functions.str.capitalizeWords(e)}
            </button>
          </div>
        )}
      </div>
    }, []);

    const Pages = useCallback(({ nowPage }: PageBtn) => {
      if (nowPage === "NONE") return "none :p"

      const NowPage = () => {
        switch (nowPage.categorie) {
          case "search": {
            switch (nowPage.pages) {
              case "general": {

                return <></>
              }
              case "tags": {

                return <></>
              }
              case "history": {

                return <></>
              }
              case "export/import": {

                return <></>
              }
            }
          }
          case "account": {
            switch (nowPage.pages) {
              case "local": {

                return <>
                  <button kiase-sty="" onClick={() => {
                    newInput.message("你確定你要砍掉這個賬號？", [
                      { name: "是沒錯", value: "yes", key: "Enter" },
                      { name: "先不要", value: "" },
                    ], (e) => {
                      if (e === "yes") {
                        setTimeout(() => {

                          newInput.message("你現在的所有東西都會直接無\n你的下載 你的暫存 你的歷史 都會無", [
                            { name: "啊對 就是要刪", value: "yes", key: "Enter" },
                            { name: "啊？那算了", value: "" },
                          ], (e) => {
                            if (e === "yes") {
                              setTimeout(() => {

                                newInput.message("你真的不在乎這些東西會消失？", [
                                  { name: "刪掉吧", value: "yes", key: "Delete" },
                                  { name: "還是會care的 那算了", value: "" },
                                ], (e) => {
                                  if (e === "yes") {
                                    setWorkSpaceStatus(prev => {
                                      const _ = cloneDeep(prev)
                                      _.autoLogin = false
                                      _.rememberPassword = ""
                                      _.lastUser = 0
                                      _.userList = _.userList.filter((_, i) => i !== userIndex)

                                      return _
                                    })
                                    setIsLogin(false)
                                  }
                                })

                              }, .5e3);
                            }
                          })

                        }, .5e3);
                      }
                    })
                  }}>刪賬號</button>
                </>
              }
              case "e621": {

                return <></>
              }
              case "export/import": {

                return <></>
              }
            }
          }
          case "download": {
            switch (nowPage.pages) {
              case "general": {

                return <></>
              }
              case "history": {

                return <></>
              }
              case "export/import": {

                return <></>
              }
            }
          }
          case "appearance": {
            switch (nowPage.pages) {
              case "general": {
                const scaleGear = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]

                return <>
                  <KiloDown.Title>{"整體的縮放"}</KiloDown.Title>
                  <KiloDown.Thirdtitle>{"除非有特殊需求 不然不要縮太小 對眼睛不好"}</KiloDown.Thirdtitle>
                  <div className={style["buttonList"]}>
                    {scaleGear.map((scale, i) => <button
                      kiase-sty=""
                      onClick={() => setWorkSpaceStatus(e => {
                        const _ = cloneDeep(e)

                        _.userList[userIndex].setting.appearance.scale = scale

                        return _
                      })}
                    >
                      {scale}%
                    </button>)}
                  </div>

                  <br />
                  <br />

                  <KiloDown.Title>{"右下角時鐘的格式"}</KiloDown.Title>
                  <KiloDown.Thirdtitle>{"除非特殊需求 啊不然建議還是隨便寫個"}</KiloDown.Thirdtitle>
                  <KiloDown.SmallText>{"除非....額 你跟我一樣失去了時間觀念"}<br />{"欸那不是更應該放時鐘嗎"}</KiloDown.SmallText>
                  <br />
                  <br />
                  <div small-txt="">{
                    [
                      ":HH:  - 24小時制的小時",
                      ":mm:  - 分鐘",
                      ":ss:  - 秒",
                      "",
                      "-YY-  - 四位數的年份",
                      "-yy-  - 兩位數的年份",
                      "-mm-  - 數字的月",
                      "-dd-  - 日",
                    ].map((e, i) => e ? <div pre-text="" key={i}>{e}</div> : <br />)
                  }</div >
                  <br />
                  {(() => {
                    const count = workSpaceStatus.userList[userIndex].setting.appearance.clockFormat.length;
                    let txt = "";

                    if (count > 2) txt = "啊 下面這個....不要放太多....會破版....除非你喜歡破版的感覺.....";
                    else if (count <= 0) txt = "啊你的....時鐘呢?";

                    if (txt)
                      return <> <KiloDown.SmallText>{txt}</KiloDown.SmallText><br /><br /></>;
                  })()}
                  <SettingEditor.ListEditor
                    list={workSpaceStatus.userList[userIndex].setting.appearance.clockFormat}
                    onChange={(e) => {
                      setWorkSpaceStatus(prev => {
                        const _ = cloneDeep(prev);
                        _.userList[userIndex].setting.appearance.clockFormat = e;
                        return _
                      })
                    }}
                    children={(child) => <div className={style["ListEditor"]}>
                      <div className={style["list"]}>
                        {child.items.map((e, i) => <div className={style["item"]}>
                          <input type="text" kiase-sty="" value={e.data} onChange={t => e.ops.update(t.currentTarget.value)} />

                          <button kiase-sty="" non-pad="" onClick={() => e.ops.moveUp()}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M331-384q-8.1 0-13.05-5.4Q313-394.8 313-402q0-1 5.88-12.77L461-557q4-4 9-6t10-2q5 0 10 2t9 6l142.12 142.19q2.94 2.95 4.41 6.38Q647-405 647-401.5q0 7-4.95 12.25T629-384H331Z" /></svg>
                          </button>

                          <button kiase-sty="" non-pad="" onClick={() => e.ops.moveDown()}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M461-403 318.88-545.19q-2.94-2.95-4.41-6.38Q313-555 313-558.5q0-7 4.95-12.25T331-576h298q8.1 0 13.05 5.4Q647-565.2 647-558q0 1-5.88 12.77L499-403q-4 4-9 6t-10 2q-5 0-10-2t-9-6Z" /></svg>
                          </button>

                          <button kiase-sty="" non-pad="" onClick={() => e.ops.duplicate()}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M360-240q-29.7 0-50.85-21.15Q288-282.3 288-312v-480q0-29.7 21.15-50.85Q330.3-864 360-864h384q29.7 0 50.85 21.15Q816-821.7 816-792v480q0 29.7-21.15 50.85Q773.7-240 744-240H360Zm0-72h384v-480H360v480ZM216-96q-29.7 0-50.85-21.15Q144-138.3 144-168v-516q0-15.3 10.29-25.65Q164.58-720 179.79-720t25.71 10.35Q216-699.3 216-684v516h420q15.3 0 25.65 10.29Q672-147.42 672-132.21t-10.35 25.71Q651.3-96 636-96H216Zm144-216v-480 480Z" /></svg>
                          </button>

                          <button kiase-sty="" non-pad="" onClick={() => e.ops.remove()}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M480-429 316-265q-11 11-25 10.5T266-266q-11-11-11-25.5t11-25.5l163-163-164-164q-11-11-10.5-25.5T266-695q11-11 25.5-11t25.5 11l163 164 164-164q11-11 25.5-11t25.5 11q11 11 11 25.5T695-644L531-480l164 164q11 11 11 25t-11 25q-11 11-25.5 11T644-266L480-429Z" /></svg>
                          </button>
                        </div>)}
                      </div >
                      <button kiase-sty="" non-pad="" onClick={() => child.addItem("-mm-")}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"><path d="M444-444H276q-15.3 0-25.65-10.29Q240-464.58 240-479.79t10.35-25.71Q260.7-516 276-516h168v-168q0-15.3 10.29-25.65Q464.58-720 479.79-720t25.71 10.35Q516-699.3 516-684v168h168q15.3 0 25.65 10.29Q720-495.42 720-480.21t-10.35 25.71Q699.3-444 684-444H516v168q0 15.3-10.29 25.65Q495.42-240 480.21-240t-25.71-10.35Q444-260.7 444-276v-168Z" /></svg>
                      </button>
                    </div >}
                  />


                </>
              }
              case "theme": {
                const [newColor, setNewColor] = useState<string>("#ffffff")
                const [colorList, setColorList] = useState<string[]>([])

                useEffect(() => {
                  (async () => {

                    const wallpaperUrl = workSpaceStatus.userList[userIndex].setting.appearance.wallpaper.url!;

                    const out = await LABS_E621_API.other.proxy({ url: wallpaperUrl });

                    setColorList(out)
                  })()

                }, [workSpaceStatus.userList[userIndex].setting.appearance.wallpaper])

                useEffect(() => {
                  setNewColor(workSpaceStatus.userList[userIndex].setting.appearance.color)
                }, [])

                return <>
                  <div>懶惰寫界面 先這樣吧 凑合著用</div>
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.currentTarget.value)} />
                  <button kiase-sty="" onClick={() => setWorkSpaceStatus((e) => {
                    const _ = cloneDeep(e)

                    _.userList[userIndex].setting.appearance.color = newColor;
                    _app.setColor(newColor)

                    return _
                  })}>{"apply"}</button>
                  <br />
                  {colorList}

                </>
              }
              case "wallpaper": {
                const [bgCfg, setBgCfg] = useState<workSpaceType.Unit.BaseItem.Image>({
                  url: ""
                })

                useEffect(() => {
                  setBgCfg(workSpaceStatus.userList[userIndex].setting.appearance.wallpaper)
                }, [workSpaceStatus])

                const updateVal = (key: keyof workSpaceType.Unit.BaseItem.Image, val: number) => {
                  setBgCfg(prev => ({
                    ...prev,
                    [key]: val
                  }))
                }

                return <div className={style["Wallpaper"]}>
                  <div className={style["frame"]}>
                    <div
                      className={style["image"]}
                      onDragOver={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.add(style["ondrag"])
                      }}

                      onDragLeave={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove(style["ondrag"])
                      }}

                      onDrop={e => {
                        if (!e.dataTransfer) return;
                        e.preventDefault();
                        e.stopPropagation();

                        const itemdata = e.dataTransfer.getData(e621Type.DragItemType.appname)

                        if (itemdata) {
                          const item: e621Type.DragItemType.defaul = JSON.parse(itemdata)
                          const { data, type } = item
                          if (type === "post") {
                            someActions.setAsWallpaper(userIndex, data.file.url!, data)
                            setBgCfg({
                              url: data.file.url!,
                              positionX: 50,
                              positionY: 50,
                              fromPost: data
                            })
                          }
                        }

                        e.currentTarget.classList.remove(style["ondrag"])
                      }}
                    >
                      <Background bg={bgCfg} />
                      <div className={style["dragOverlay"]}>
                        <span>Set as Wallpaper</span>
                      </div>
                    </div>
                    <div className={style["position"]}>
                      <div>
                        <span>{"X:"}</span>
                        <div>
                          <input
                            kilo-style=""
                            type="range"
                            step={.5}
                            max={100}
                            min={0}
                            kiase-sty=""
                            value={bgCfg.positionX ?? 50}
                            onChange={(e) => updateVal("positionX", +e.currentTarget.value)}
                          />
                        </div>
                        <input
                          type="number"
                          kiase-sty=""
                          step={.5}
                          max={100}
                          min={0}
                          value={bgCfg.positionX ?? 50}
                          onChange={(e) => updateVal("positionX", +e.currentTarget.value)}
                        />
                      </div>

                      <div>
                        <span>{"Y:"}</span>
                        <div>
                          <input
                            kilo-style=""
                            type="range"
                            step={.5}
                            max={100}
                            min={0}
                            kiase-sty=""
                            value={bgCfg.positionY ?? 50}
                            onChange={(e) => updateVal("positionY", +e.currentTarget.value)}
                          />
                        </div>
                        <input
                          type="number"
                          kiase-sty=""
                          step={.5}
                          max={100}
                          min={0}
                          value={bgCfg.positionY ?? 50}
                          onChange={(e) => updateVal("positionY", +e.currentTarget.value)}
                        />
                      </div>

                      <div>
                        <span>{"S:"}</span>
                        <div>
                          <input
                            kilo-style=""
                            type="range"
                            step={.5}
                            max={500}
                            min={100}
                            kiase-sty=""
                            value={bgCfg.scale ?? 100}
                            onChange={(e) => updateVal("scale", +e.currentTarget.value)}
                          />
                        </div>
                        <input
                          type="number"
                          kiase-sty=""
                          step={.5}
                          max={500}
                          min={100}
                          value={bgCfg.scale ?? 100}
                          onChange={(e) => updateVal("scale", +e.currentTarget.value)}
                        />
                      </div>
                    </div>

                    <button kiase-sty="" onClick={() => setWorkSpaceStatus(e => {
                      const _ = cloneDeep(e);
                      _.userList[userIndex].setting.appearance.wallpaper = bgCfg
                      return _
                    })}>{"套用"}</button>
                    <button
                      kiase-sty=""
                      onClick={() => someActions.openWithGetByID(bgCfg.fromPost!)}
                      draggable={true}
                      onDragStart={(e) => {
                        dragItem(e, {
                          type: "post",
                          data: bgCfg.fromPost!
                        });
                      }}
                    >{"桌布來源"}</button>
                  </div>
                </div>
              }
            }
          }
          case "information": {
            switch (nowPage.pages) {
              case "general": {

                return <div className={style["Information"]}>
                  <h1>E621 App</h1>
                  <h2>inDev Version</h2>
                  <h3>{navigator.appVersion}</h3>

                  <br />

                  <h2>
                    用視窗化的方式 來用你的E621
                    <br />
                    十分好玩 下次別玩了
                  </h2>

                  <br />

                  <h4>
                    寫這個東西 還是很開心的
                    <br />
                    雖然 真的有夠難寫
                    <br />
                    但是起碼 我做到了
                    <br />
                    直覺的交互 直覺的邏輯
                    <br />
                    還有吃效能的動畫 欸十分好
                    <br />
                    反正 就 也算是圓了一個KILO OS的夢吧
                    <br />
                    我不知道 反正 就這樣
                  </h4>
                </div>
              }
            }
          }
        }
      }

      return <Page>
        {NowPage()}
      </Page>
    }, []);

    const SettingAndList = useCallback(({ nowPage }: PageBtn) => {
      if (nowPage === "NONE") return "none :p"
      return <div className={style["frame"]}>
        <PageButtonsList nowPage={nowPage} />
        <Pages nowPage={nowPage} key={nowPage.pages} />
      </div>
    }, [Pages, PageButtonsList])

    return (
      <WINDOW_FRAME className={
        [
          style["Setting"],
          nowPage !== "NONE" && style["inSetting"]
        ].join(" ")
      } menulist={
        [
          windowAction(windowID),
          [
            "Categorie",
            [
              [
                "Home",
                () => setNowPage("NONE")
              ],
              ...settingTabs.categorieList.map(e => [functions.str.capitalizeWords(e), () => {
                setNowPage({
                  categorie: e,
                  pages: settingTabs.pageList[e]![0] as any
                })
              }]) as MenuAction.Item[]
            ]
          ],
          ...(nowPage !== "NONE" ?
            [[
              "Tab",
              settingTabs.pageList[nowPage.categorie].map(e => [functions.str.capitalizeWords(e), () => {
                setNowPage({
                  categorie: nowPage.categorie,
                  pages: e as any
                })
              }])
            ]]
            : []) as MenuButtonType[]
        ]}>
        <div className={style["home"]}>
          {(
            [
              [
                "search",
                <svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px"><path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" /></svg>
              ],
              [
                "account",
                <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M222-255q63-44 125-67.5T480-346q71 0 133.5 23.5T739-255q44-54 62.5-109T820-480q0-145-97.5-242.5T480-820q-145 0-242.5 97.5T140-480q0 61 19 116t63 109Zm257.81-195q-57.81 0-97.31-39.69-39.5-39.68-39.5-97.5 0-57.81 39.69-97.31 39.68-39.5 97.5-39.5 57.81 0 97.31 39.69 39.5 39.68 39.5 97.5 0 57.81-39.69 97.31-39.68 39.5-97.5 39.5Zm.66 370Q398-80 325-111.5t-127.5-86q-54.5-54.5-86-127.27Q80-397.53 80-480.27 80-563 111.5-635.5q31.5-72.5 86-127t127.27-86q72.76-31.5 155.5-31.5 82.73 0 155.23 31.5 72.5 31.5 127 86t86 127.03q31.5 72.53 31.5 155T848.5-325q-31.5 73-86 127.5t-127.03 86Q562.94-80 480.47-80Zm-.47-60q55 0 107.5-16T691-212q-51-36-104-55t-107-19q-54 0-107 19t-104 55q51 40 103.5 56T480-140Zm0-370q34 0 55.5-21.5T557-587q0-34-21.5-55.5T480-664q-34 0-55.5 21.5T403-587q0 34 21.5 55.5T480-510Zm0-77Zm0 374Z" /></svg>
              ],
              [
                "download",
                <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M479.87-325q-5.87 0-10.87-2-5-2-10-7L308-485q-9-9.27-8.5-21.64.5-12.36 9.11-21.36 9.39-9 21.89-9t21.5 9l98 99v-341q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v341l99-99q8.8-9 20.9-8.5 12.1.5 21.49 9.5 8.61 9 8.61 21.5t-9 21.5L501-334q-5 5-10.13 7-5.14 2-11 2ZM220-160q-24 0-42-18t-18-42v-113q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v113h520v-113q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v113q0 24-18 42t-42 18H220Z" /></svg>
              ],
              [
                "appearance",
                <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M583-40H440q-14.45 0-24.23-9.78Q406-59.55 406-74v-250q0-14.45 9.77-24.23Q425.55-358 440-358h41v-133H140q-24.75 0-42.37-17.63Q80-526.25 80-551v-193q0-24.75 17.63-42.38Q115.25-804 140-804h83v-42q0-14.45 9.77-24.22Q242.55-880 257-880h509q14.45 0 24.22 9.78Q800-860.45 800-846v152q0 14.45-9.78 24.22Q780.45-660 766-660H257q-14.45 0-24.23-9.78Q223-679.55 223-694v-50h-83v193h341q24.75 0 42.38 17.62Q541-515.75 541-491v133h42q14.45 0 24.22 9.77Q617-338.45 617-324v250q0 14.45-9.78 24.22Q597.45-40 583-40Zm-117-60h91v-198h-91v198ZM283-720h457v-100H283v100Zm183 620h91-91ZM283-720v-100 100Z" /></svg>
              ],
              [
                "information",
                <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M483.18-280q12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-180q0-12.75-8.68-21.38-8.67-8.62-21.5-8.62-12.82 0-21.32 8.62-8.5 8.63-8.5 21.38v180q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63Zm-3.2-314q14.02 0 23.52-9.2T513-626q0-14.45-9.48-24.22-9.48-9.78-23.5-9.78t-23.52 9.78Q447-640.45 447-626q0 13.6 9.48 22.8 9.48 9.2 23.5 9.2Zm.29 514q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Zm.23-60Q622-140 721-239.5t99-241Q820-622 721.19-721T480-820q-141 0-240.5 98.81T140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" /></svg>
              ],
            ] as [("search" | "account" | "download" | "appearance" | "information"), JSX.Element][]).map((e, i) =>
              <button
                key={i}
                className={[showIndex && style["displayIndex"]].join(" ")}
                onClick={() => {
                  setNowPage({
                    categorie: e[0],
                    pages: settingTabs.pageList[e[0]][0] as any
                  })
                }}>
                <div className={style["icon"]}>{e[1]}</div>
                <div className={style["index"]}>{i + 1}</div>
                <div className={style["name"]}>{functions.str.capitalizeWords(e[0])}</div>
              </button>)
          }

        </div>
        <div className={style["setting"]}>
          {nowPage === "NONE" ? "none :p" : <SettingAndList nowPage={nowPage} key={nowPage.categorie} />}
        </div>
      </WINDOW_FRAME >
    )
  },
  tmpList: function () {
    const windowID = "tmp-list"
    const [start, setStart] = useState<boolean>(false)

    const eRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      void eRef.current!.clientHeight
      setStart(true)
    }, [])

    return (
      <WINDOW_FRAME className={style["tmpList"]} menulist={[
        windowAction(windowID),
      ]}>
        <div
          className={[style["list"], start ? style["START"] : ""].join(" ")}
          ref={eRef}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={e => {
            if (!e.dataTransfer) return;
            e.preventDefault();
            e.stopPropagation();

            const itemdata = e.dataTransfer.getData(e621Type.DragItemType.appname)

            if (itemdata) {
              const item: e621Type.DragItemType.defaul = JSON.parse(itemdata)
              const { data, type } = item
              if (type === "post") {
                const id = data.id;
                someActions.saveToTmp(userIndex, {
                  type: "postGetByID",
                  data: {
                    currentId: data.id,
                    status: "success",
                    fetchedPost: data
                  }
                }, `Post Get By ID [ ${data.id} ]`, `post_get_by_id-${data.id}`)
              } else if (type === "postSearch") {
                someActions.saveToTmp(userIndex, { type: "postSearch", data: item.data }, item.thisWindow!.title, item.thisWindow!.id)
              } else if (type === "tag") {
                if (data.action === "=") {
                  const createAt = new Date().getTime()
                  someActions.saveToTmp(userIndex,
                    {
                      type: "postSearch",
                      data: {
                        nowPage: 1,
                        pageCache: [],
                        searchTags: [data.tag]
                      }
                    }
                    , `Post Search [ ${data.tag} ]`, `post_search-${createAt}`)
                }
              }
            }
          }}
        >
          {workSpaceStatus.userList[userIndex].saves.tmpList.map((item, index) => {
            const baseDely = index * .05
            return <div
              key={item.createAt}
              className={style["item"]}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              style={{
                transitionDelay: `${baseDely}s`
              }}
              onDrop={e => {
                if (!e.dataTransfer) return;
                if (item.data.type !== "postSearch") return;
                e.preventDefault();
                e.stopPropagation();

                const itemdata = e.dataTransfer.getData(e621Type.DragItemType.appname)

                if (itemdata) {
                  const item: e621Type.DragItemType.defaul = JSON.parse(itemdata)
                  const { data, type } = item
                  if (type === "tag") {
                    if (data.action === "+") {
                      setWorkSpaceStatus(prev => {
                        const _ = cloneDeep(prev)

                        _.userList[userIndex].saves.tmpList = _.userList[userIndex].saves.tmpList
                          .map((item, i) => {
                            if (i !== index) return item;
                            if (item.data.type !== "postSearch") return item;
                            let searchTags = [...item.data.data.searchTags]
                            if (searchTags.some(e => e === "-" + data.tag)) {
                              searchTags = searchTags.filter(e => e !== "-" + data.tag)
                            } else if (searchTags.some(e => e === data.tag)) {
                              return item
                            } else {
                              searchTags.push(data.tag)
                            };

                            return {
                              createAt: item.createAt,
                              windowId: item.windowId,
                              windowTitle: `Post Search [ ${searchTags.join(",")} ]`,
                              data: {
                                type: "postSearch",
                                data: {
                                  nowPage: 1,
                                  pageCache: [],
                                  searchTags: searchTags
                                },
                                note: item.data.note
                              }
                            }
                          })

                        return _
                      })
                    } else if (data.action === "-") {
                      setWorkSpaceStatus(prev => {
                        const _ = cloneDeep(prev)

                        _.userList[userIndex].saves.tmpList = _.userList[userIndex].saves.tmpList
                          .map((item, i) => {
                            if (i !== index) return item;
                            if (item.data.type !== "postSearch") return item;
                            let searchTags = [...item.data.data.searchTags]
                            if (searchTags.some(e => e === data.tag)) {
                              searchTags = searchTags.filter(e => e !== data.tag)
                            } else if (searchTags.some(e => e === "-" + data.tag)) {
                              return item
                            } else {
                              searchTags.push("-" + data.tag)
                            };

                            return {
                              createAt: item.createAt,
                              windowId: item.windowId,
                              windowTitle: `Post Search [ ${searchTags.join(",")} ]`,
                              data: {
                                type: "postSearch",
                                data: {
                                  nowPage: 1,
                                  pageCache: [],
                                  searchTags: searchTags
                                },
                                note: item.data.note
                              }
                            }
                          })

                        return _
                      })
                    }
                  }
                }
              }}
            >
              <div className={style["main"]}>
                <div className={style["info"]}>
                  <div className={style["title"]}>
                    {item.windowTitle}
                  </div>
                  <div className={style["createAt"]}>
                    {`Create at // ${cnvFormat.clock(item.createAt, "-YY- -MM- -dd- :HH:::mm:::ss:")}`}
                    <br />
                    <span style={{ fontSize: "0.8em", opacity: 0.7 }}>ID: {item.windowId}</span>
                  </div>
                </div>
                <div className={style["buttons"]}>
                  {
                    ([
                      [
                        <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px"><path d="M267.33-120q-27.5 0-47.08-19.58-19.58-19.59-19.58-47.09V-740h-7.34q-14.16 0-23.75-9.62-9.58-9.61-9.58-23.83 0-14.22 9.58-23.72 9.59-9.5 23.75-9.5H352q0-14.33 9.58-23.83 9.59-9.5 23.75-9.5h189.34q14.16 0 23.75 9.58 9.58 9.59 9.58 23.75h158.67q14.16 0 23.75 9.62 9.58 9.62 9.58 23.83 0 14.22-9.58 23.72-9.59 9.5-23.75 9.5h-7.34v553.33q0 27.5-19.58 47.09Q720.17-120 692.67-120H267.33Zm425.34-620H267.33v553.33h425.34V-740Zm-425.34 0v553.33V-740ZM480-414.67l89.33 90q10.34 10.34 25.34 10.67 15 .33 25.33-10.33 10.33-10.67 10.33-25.34 0-14.66-10.33-25l-89.33-90.66L620-556q10.33-10.33 10.33-25T620-606q-10.33-10.33-25.33-10.33-15 0-25.34 10.33L480-516l-88.67-90Q381-616.33 366-616.33q-15 0-25.33 10.33-10.34 10.33-10.34 25.33 0 15 10.34 25.34l89.33 90-89.33 90Q330.33-365 330.33-350q0 15 10.34 25.33Q351-314.33 366-314.33q15 0 25.33-10.34l88.67-90Z" /></svg>,
                        () => {
                          setWorkSpaceStatus(prev => {
                            const _ = cloneDeep(prev)
                            const list = cloneDeep(_.userList[userIndex].saves.tmpList)
                            _.userList[userIndex].saves.tmpList = list.filter(_item => {
                              return _item.createAt !== item.createAt
                            })
                            return _
                          })
                        }
                      ],
                      [
                        <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px"><path d="M378-524q16.33-21.33 44.67-34.67Q451-572 481.33-572q58 0 96 38t38 96q0 58-38 96.33-38 38.34-96 38.34-39.33 0-71.16-19-31.84-19-49.5-50-5.34-9-15.5-12.5-10.17-3.5-19.17 1.5-10.67 5-13.83 15.83-3.17 10.83 2.5 20.5 24.66 44.67 68.33 70.5t98.33 25.83q78 0 132.67-54.66Q668.67-360 668.67-438q0-78-54.67-132.67-54.67-54.66-132.67-54.66-42.66 0-78.33 17.33t-60.33 42.67v-42q0-10.34-7.17-17.5Q328.33-632 318-632t-17.83 7.17q-7.5 7.16-7.5 17.5v108q0 10.33 7.5 17.83 7.5 7.5 17.83 7.5h109.33q10.34 0 17.5-7.5Q452-489 452-499.33q0-10.34-7.17-17.5-7.16-7.17-17.5-7.17H378ZM226.67-80q-27 0-46.84-19.83Q160-119.67 160-146.67v-666.66q0-27 19.83-46.84Q199.67-880 226.67-880H533q13.33 0 25.83 5.33 12.5 5.34 21.5 14.34l200 200q9 9 14.34 21.5Q800-626.33 800-613v466.33q0 27-19.83 46.84Q760.33-80 733.33-80H226.67Zm0-66.67h506.66v-464.66l-202-202H226.67v666.66Zm0 0v-666.66V-146.67Z" /></svg>,
                        () => {
                          const targetID = item.windowId || `${item.createAt}`;

                          const pureId = targetID.replace(/^(post_search-|post-|post_get_by_id-|pool-)/, "");

                          const getChild = () => {
                            const remountKey = Date.now();

                            switch (item.data.type) {
                              case "postSearch":
                                return <windowsType.postSearch key={remountKey} id={pureId} />;

                              case "post":
                                return <windowsType.post key={remountKey} id={pureId} />;

                              case "postGetByID":
                                return <windowsType.postGetByID key={remountKey} id={pureId} />;

                              case "pool":
                                return <windowsType.pool key={remountKey} id={pureId} />;

                              default:
                                return <></>;
                            }
                          };

                          const wm = wmRef.current;
                          if (!wm) return;

                          if (wm.hasWindowID(targetID)) {
                            wm.updateWindow(targetID, {
                              title: item.windowTitle,
                              customData: item.data,
                              children: getChild()
                            });
                            wm.bringToFront(targetID);
                            Kiasole.log(`Restore Window: ${targetID}`);
                          } else {
                            wm.createWindow({
                              title: item.windowTitle,
                              id: targetID,
                              customData: item.data,
                              children: getChild(),
                            });
                          }
                        }
                      ],
                    ] as [JSX.Element, (() => void)][]).map((e, i) => <button key={i} onClick={e[1]}>{e[0]}</button>)
                  }
                </div>
              </div>
              <div className={style["flash"]}>

                <div
                  className={style["frist"]}
                  style={{
                    transitionDelay: `${baseDely + .05}s`
                  }}
                />

                <div className={style["add"]} />

              </div>
            </div>
          })}
        </div>
      </WINDOW_FRAME >
    )
  }
}

someActions.openWithGetByID = (post) => {
  const windowID = `post_get_by_id-${post.id}`
  const postID = post.id
  if (wmRef.current?.getWindow(windowID))
    wmRef.current.bringToFront(windowID)
  else
    wmRef.current?.createWindow({
      id: windowID,
      title: `Post [ ${postID} ]`,
      children: <windowsType.postGetByID id={`${postID}`} />,
      customData: {
        type: "postGetByID",
        data: {
          currentId: postID,
          status: "success",
          fetchedPost: post
        }
      }
    })
}


someActions.openWithViewer = (post) => {
  const windowID = `viewer-${post.id}`
  const postID = post.id
  if (wmRef.current?.getWindow(windowID))
    wmRef.current.bringToFront(windowID)
  else
    wmRef.current?.createWindow({
      id: windowID,
      title: `viewer [ ${postID} ]`,
      children: <windowsType.viewer id={`${postID}`} />,
      customData: {
        type: "viewer",
        data: post
      }
    })
}

const Menu = () => {
  const [menuDisplay, setMenuDisplay] = useState<boolean>(false);
  const [menuItems, setMenuItems] = useState<MenuAction.Item[]>([]);
  const [menuPosition, setMenuPosition] = useState<[number, number]>([0, 0]);
  const [menuCenter, setMenuCenter] = useState<MenuAction.CenterPoint>("tl");
  const [dragEvent, setDragEvent] = useState<(e?: dragEvent) => void>(() => { });
  const [hoverd, setHoverd] = useState<boolean>(false);

  MenuAction.showMenu = (items: MenuAction.Item[], [top, left], center, onDrag) => {
    setMenuCenter(center ?? "tl")
    setMenuItems(items);
    setMenuPosition([top, left]);
    setMenuDisplay(true);
    setDragEvent(() => (onDrag ?? (() => { })))
  };

  MenuAction.closeMenu = () => {
    setMenuDisplay(false);
    setMenuItems([]);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuDisplay(false);
  };

  useEffect(() => {
    if (hoverd) return

    const clickEvent = () => {
      setMenuDisplay(false)
    }

    const keyEvent = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setMenuDisplay(false)

      }
    }

    window.addEventListener("click", clickEvent)
    window.addEventListener("keydown", keyEvent)
    return () => {
      window.removeEventListener("click", clickEvent)
      window.removeEventListener("keydown", keyEvent)
    }
  }, [hoverd])

  return (
    <div
      className={[style["Menu"], menuDisplay ? "" : style["hide"]].join(" ")}
      onClick={handleBackgroundClick}
      onContextMenu={handleBackgroundClick}
    >
      <div
        className={[style["Buttons"], style[menuCenter]].join(" ")}
        style={{
          top: `${menuPosition[0]}px`,
          left: `${menuPosition[1]}px`,
        }}

        onMouseUp={(e) => {
          e.stopPropagation()
          setMenuDisplay(false)
        }}

        onMouseMove={() => setHoverd(true)}
        onMouseLeave={() => setHoverd(false)}
      >
        {menuItems.map((item, index) => (
          <button
            key={`${index}-${item[0]}`}
            kiase-style=""
            onMouseUp={() => {
              if (item[1]) item[1]();
              setMenuDisplay(false);
            }}
            draggable={item.length === 3}
            onDragStart={(e) => {
              item[2] ? dragItem(e, item[2]) : "";
              setMenuDisplay(false);
              dragEvent();
            }}
          >
            {item[0]}
          </button>
        ))}
      </div>
    </div>
  )
}

const Background = ({ bg }: { bg: workSpaceType.Unit.BaseItem.Image }) => {
  return (
    <div className={style["Background"]}>
      <div className={style["Background"]}>
        <div className={style["Image"]} style={{
          backgroundImage: `url(${bg.url ?? ""})`,
          backgroundPositionX: `${bg.positionX ?? 50}%`,
          backgroundPositionY: `${bg.positionY ?? 50}%`,
          backgroundSize: bg.scale ? bg.scale + "%" : "cover",
          backgroundRepeat: "no-repeat"
        }} />
      </div>
    </div>
  )
}

const Desktop = () => {
  const [background, setBackground] = useState<workSpaceType.Unit.BaseItem.Image>({ url: "" })
  const [mouseIsPress, setMouseIsPress] = useState<boolean>(false)
  const [windowsList, setWindowsList] = useState<{
    id: string;
    title: string;
    customData?: e621Type.defaul | undefined;
  }[]>([])

  const [clock, setClock] = useState<number>(0)

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherIndex, setSwitcherIndex] = useState(0);
  const originalStatesRef = useRef<Map<string, { isMinimized: boolean, isFocused: boolean }>>(new Map());

  useEffect(() => {

    const interval = setInterval(() => {
      setClock(new Date().getTime())
    }, 100);

    return () => {
      clearInterval(interval)
    }
  }, [])

  const [startMenu, setStartMenu] = useState<boolean>(false)

  wmRef = useRef<WindowManager<e621Type.defaul> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wm = wmRef.current;
    if (!wm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === "Tab") {
        e.preventDefault();

        if (!switcherOpen) {
          const allWindows = wm.getWindows();
          if (allWindows.length === 0) return;

          const snapshot = new Map();
          allWindows.forEach(win => {
            const instance = wm.getWindow(win.id);
            snapshot.set(win.id, {
              isMinimized: instance?.isMinimized,
              isFocused: instance?.isFocused
            });
            instance?.minimize();
          });
          originalStatesRef.current = snapshot;

          const nextIdx = (switcherIndex + 1) % allWindows.length;
          setSwitcherIndex(nextIdx);
          setSwitcherOpen(true);

          wm.getWindow(allWindows[nextIdx].id)?.focus();
        } else {
          const allWindows = wm.getWindows();
          allWindows.forEach(win => {
            const instance = wm.getWindow(win.id);
            instance?.minimize();
          });
          const nextIdx = (switcherIndex + 1) % allWindows.length;

          wm.getWindow(allWindows[nextIdx].id)?.focus();
          setSwitcherIndex(nextIdx);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" && switcherOpen) {
        const allWindows = wm.getWindows();
        const selectedWinId = allWindows[switcherIndex]?.id;
        const snapshot = originalStatesRef.current;

        allWindows.forEach(win => {
          const prevState = snapshot.get(win.id);
          const instance = wm.getWindow(win.id);

          if (win.id === selectedWinId) {
            instance?.focus();
          } else {
            if (prevState?.isMinimized) {
              instance?.minimize();
            } else {
              // 如果之前不是縮小的，但現在不是焦點，我們只需要確保它不縮小
              // 但不呼叫 focus() 以免搶走選中視窗的焦點
              // 這裡假設 WindowManager 有 restore 方法或類似邏輯
              // 如果只有 focus 能取消 minimize，那就依賴 snapshot
              if (!prevState?.isMinimized) {
                instance?.focus();
              }
            }
          }
        });

        setSwitcherOpen(false);
        originalStatesRef.current.clear();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [switcherOpen, switcherIndex, windowsList]);

  useEffect(() => {
    if (!mouseIsPress) return

    const clickEvent = () => {
      setMouseIsPress(false)
    }

    document.addEventListener("click", clickEvent)
    return () => {
      document.removeEventListener("click", clickEvent)
    }
  }, [mouseIsPress])

  useEffect(() => {
    let keyispress = false

    const keyup = (e: KeyboardEvent) => {
      keyispress = false
    }

    const keydown = (e: KeyboardEvent) => {
      if (keyispress) return;

      switch (e.code) {
        case "Escape": {
          keyispress = true
          setStartMenu(false)
        }
      }

      if (e.metaKey && e.ctrlKey) {
        keyispress = true
        setStartMenu(e => !e)
      }
    }

    document.addEventListener("keydown", keydown)
    document.addEventListener("keyup", keyup)

    return () => {
      document.removeEventListener("keydown", keydown)
      document.removeEventListener("keyup", keyup)
    }
  }, [])

  useEffect(() => {
    let keyispress = false

    const keyup = (e: KeyboardEvent) => {
      keyispress = false
    }

    const keydown = (e: KeyboardEvent) => {
      if (keyispress) return;

      if (e.ctrlKey && (e.code === "KeyQ")) {
        keyispress = true
        windowsList
          .map(e => wmRef.current?.getWindow(e.id)!)
          .filter(e => e.isFocused)[0].close();
      }

      if (e.ctrlKey && (e.code === "ArrowDown")) {
        keyispress = true
        const win = windowsList
          .map(e => wmRef.current?.getWindow(e.id)!)
          .filter(e => e.isFocused)[0];

        if (win.isMaximized) {
          win.toggleMaximize();
        } else {
          win.minimize();
        }
      }
    }

    document.addEventListener("keydown", keydown)
    document.addEventListener("keyup", keyup)

    return () => {
      document.removeEventListener("keydown", keydown)
      document.removeEventListener("keyup", keyup)
    }
  }, [windowsList])

  useEffect(() => {
    const { setting, saves } = workSpaceStatus.userList[userIndex]
    const wallpaper = setting.appearance.wallpaper
    setBackground(typeof wallpaper === "number" ? saves.wallpapers[wallpaper] : wallpaper)
    _app.setColor(setting.appearance.color)
  }, [workSpaceStatus]);

  useEffect(() => {
    if (containerRef.current && !wmRef.current) {
      wmRef.current = new WindowManager(containerRef.current);
    }
  }, []);

  useEffect(() => {
    const wm = wmRef.current
    if (wm) {
      if (workSpaceStatus.userList[userIndex].windowsStatus) {
        wm.applySnapshot(
          workSpaceStatus.userList[userIndex].windowsStatus,
          (windowId, customData) => {

            if (!customData) return <div>Error: No Data</div>;

            switch (customData.type) {
              case "postSearch":
                const pureId = windowId.replace("post_search-", "");

                return <windowsType.postSearch id={pureId} />;

              case "post":
                return <windowsType.post id={windowId.replace("post-", "")} />;

              case "postGetByID":
                return <windowsType.postGetByID id={windowId.replace("post_get_by_id-", "")} />;

              case "pool":
                return <windowsType.pool id={windowId.replace("pool-", "")} />;

              case "viewer":
                return <windowsType.viewer id={windowId.replace("viewer-", "")} />;

              case "setting":
                return <windowsType.setting />;

              case "tmp":
                return <windowsType.tmpList />;

              default:
                return <div>Unknown Window Type</div>;
            }
          }
        );
        setWindowsList(wm.getWindows())
      }
    }
  }, []);

  useEffect(() => {
    const wm = wmRef.current
    if (wm) {
      const update = () => {
        if (switcherOpen) return;
        if (!wm) return;
        setWindowsList(wm.getWindows())
        setWorkSpaceStatus((e) => {
          e.userList[userIndex].windowsStatus = wm.captureSnapshot()
          return e
        })
      }

      wm.addEventListener("create", update)
      wm.addEventListener("close", update)
      wm.addEventListener("focus", update)
      wm.addEventListener("moveEnd", update)
      wm.addEventListener("resizeEnd", update)
      wm.addEventListener("idupdate", update)

      return () => {
        if (wm) {
          wm.removeEventListener("create", update)
          wm.removeEventListener("close", update)
          wm.removeEventListener("focus", update)
          wm.removeEventListener("moveEnd", update)
          wm.removeEventListener("resizeEnd", update)
          wm.removeEventListener("idupdate", update)
        }
      }
    }
  }, [switcherOpen])

  useEffect(() => {
    const winID = "tmp-list"

    if (wmRef.current?.hasWindowID(winID)) {
      wmRef.current.updateWindow(winID, {
        children: <windowsType.tmpList />
      })
    }
  }, [workSpaceStatus.userList[userIndex].saves.tmpList])

  useEffect(() => {
    const winID = "app-setting"

    if (wmRef.current?.hasWindowID(winID)) {
      wmRef.current.updateWindow(winID, {
        children: <windowsType.setting />
      })
    }
  },
    [
      workSpaceStatus.userList[userIndex].setting,
      workSpaceStatus.userList[userIndex].history,
      workSpaceStatus.userList[userIndex].saveInfo.user,
    ]
  )

  type menuButtonType = [string, () => void][]

  const onClickEvent = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, menu: menuButtonType) => {
    event.stopPropagation()
    event.preventDefault()
    const btn = (event.target as HTMLButtonElement)
    const btnRect = btn.getBoundingClientRect()
    const x = btnRect.top
    const y = btnRect.left + (btnRect.width / 2)
    MenuAction.showMenu(menu, [x, y], "bc")
  }

  const windowAction: (id: string) => menuButtonType = (id) => {
    const win = wmRef.current?.getWindow(id)

    return [
      ["Reset Rect 95", () => { win?.setRect({ width: 95, height: 95, left: 2.5, top: 2.5 }) }],
      ["Reset Rect 90", () => { win?.setRect({ width: 90, height: 90, left: 5, top: 5 }) }],
      ["Reset Rect 85", () => { win?.setRect({ width: 85, height: 85, left: 7.5, top: 7.5 }) }],
      ["Reset Rect 80", () => { win?.setRect({ width: 80, height: 80, left: 10, top: 10 }) }],
      ["Restore", () => { win?.focus() }],
      ["Close", () => { win?.close() }],
    ]
  }

  useEffect(() => {
    (async () => {
      await functions.timeSleep(.5e3)
      document.getElementById(style["Desktop"])?.classList.remove(style["hide"])
    })()
  }, [])

  return (
    <div id={style["Desktop"]} className={style["hide"]} style={{ zoom: `${workSpaceStatus.userList[userIndex].setting.appearance.scale}%` }}>

      <Menu />

      <div className={style["Buttons"]}>
        <div className={[style["MainArea"], startMenu ? style["startMenu"] : ""].join(" ")}>

          <div className={style["StartMenu"]}>
            <div className={style["Side"]}>
              <div>
                {
                  ([
                    [
                      "Logout",
                      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" /></svg>,
                      () => {
                        setWorkSpaceStatus(prev => {
                          const _ = cloneDeep(prev)
                          _.autoLogin = false
                          _.rememberPassword = ""
                          return _
                        })
                        setIsLogin(false)
                      }
                    ],
                    [
                      "Setting",
                      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M433-80q-27 0-46.5-18T363-142l-9-66q-13-5-24.5-12T307-235l-62 26q-25 11-50 2t-39-32l-47-82q-14-23-8-49t27-43l53-40q-1-7-1-13.5v-27q0-6.5 1-13.5l-53-40q-21-17-27-43t8-49l47-82q14-23 39-32t50 2l62 26q11-8 23-15t24-12l9-66q4-26 23.5-44t46.5-18h94q27 0 46.5 18t23.5 44l9 66q13 5 24.5 12t22.5 15l62-26q25-11 50-2t39 32l47 82q14 23 8 49t-27 43l-53 40q1 7 1 13.5v27q0 6.5-2 13.5l53 40q21 17 27 43t-8 49l-48 82q-14 23-39 32t-50-2l-60-26q-11 8-23 15t-24 12l-9 66q-4 26-23.5 44T527-80h-94Zm7-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" /></svg>,
                      () => {
                        const winID = `app-setting`
                        wmRef.current?.createWindow({
                          id: winID,
                          title: "App Setting",
                          children: <windowsType.setting />,
                          customData: {
                            type: "setting",
                            data: "NONE"
                          }
                        })

                      }
                    ],
                  ] as [string, JSX.Element, () => {}][]).map((e, i) => <button key={i} hover-tips={e[0]} onClick={() => { e[2](); setStartMenu(false) }}>{e[1]}</button>)
                }
              </div>
            </div>

            <div className={style["Buttons"]}>
              {
                ([
                  [
                    "Post Search",
                    <svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px"><path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" /></svg>,
                    () => {
                      const createAt = new Date().getTime()
                      wmRef.current?.createWindow({
                        id: `post_search-${createAt}`,
                        title: `Post Search [ ${createAt} ]`,
                        children: <windowsType.postSearch id={`${createAt}`} />,
                        customData: {
                          type: "postSearch",
                          data: {
                            nowPage: 1,
                            pageCache: [],
                            searchTags: [],
                          }
                        }
                      })
                    }
                  ],
                  [
                    "Get Post by ID",
                    <svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px"><path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" /></svg>,
                    () => {
                      const devID = 5613429;
                      const winID = `post_get_by_id-${devID}`;

                      if (wmRef.current?.hasWindowID(winID)) {
                        wmRef.current.bringToFront(winID);
                        return;
                      }

                      wmRef.current?.createWindow({
                        id: winID,
                        title: `Post Get By ID [ ${devID} ]`,
                        children: <windowsType.postGetByID id={`${devID}`} />,
                        customData: {
                          type: "postGetByID",
                          data: {
                            currentId: devID,
                            status: "loading",
                          }
                        }
                      });
                    }
                  ],
                  [
                    "Temp List",
                    <svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px"><path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" /></svg>,
                    () => {
                      const winID = `tmp-list`;

                      if (wmRef.current?.hasWindowID(winID)) {
                        wmRef.current.bringToFront(winID);
                        return;
                      }

                      wmRef.current?.createWindow({
                        id: winID,
                        title: `Temp List`,
                        customData: {
                          type: "tmp",
                        },
                        children: <windowsType.tmpList />
                      });
                    }
                  ],
                ] as [string, JSX.Element, () => {}][]).map((e, i) => <div key={i}
                  style={{
                    transitionDelay: startMenu ? `${(i * .05) + .2}s` : ""
                  }}>
                  <button onClick={() => {
                    e[2]()
                    setStartMenu(false)
                  }}>
                    <div className={style["icon"]}>{e[1]}</div>
                    <div className={style["name"]}>
                      <span>
                        {e[0]}
                      </span>
                    </div>
                  </button>
                </div>
                )
              }
            </div>
          </div>
          <div className={style["Windows"]} ref={containerRef}></div>
        </div>
        <div className={style["Bar"]}>
          <div className={style["Left"]}>
            <Button onDrop={e => { e.preventDefault(); e.stopPropagation(); }} status={startMenu ? "isOpen" : "icon"} title="StartMenu" onClick={() => setStartMenu(e => !e)}>
              <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M450-450H200v-60h250v-250h60v250h250v60H510v250h-60v-250Z" /></svg>
            </Button>
          </div>
          <div className={style["List"]} overflow-bar-none="">
            {windowsList.map((win) => {
              const thisWindow = wmRef.current?.getWindow(win.id);
              return <Button
                key={win.id}
                status={thisWindow?.isMinimized ? "mini" : thisWindow?.isFocused ? "focus" : "blur"}
                title={win.title}

                onDragEnter={(e) => {
                  if (!e.dataTransfer) return;
                  wmRef.current?.bringToFront(win.id)
                }}

                onMouseEnter={(event) => {
                  if (!mouseIsPress) return
                  onClickEvent(event, windowAction(win.id))
                }}

                onMouseDown={() => {
                  setMouseIsPress(true)
                }}

                onClick={event => {
                  switch (event?.button) {
                    case 0: {
                      if (startMenu) {
                        setStartMenu(false);
                        thisWindow?.focus()
                        return;
                      }

                      if (thisWindow?.isTop) {
                        thisWindow?.minimize()
                      } else {
                        thisWindow?.focus()
                      }

                      return;
                    };
                  };
                }}

                onMouseUp={(event) => {
                  switch (event?.button) {
                    case 1: {
                      thisWindow?.close();
                      setMouseIsPress(false)
                      MenuAction.closeMenu()
                      return;
                    };

                    case 2: {
                      onClickEvent(event, windowAction(win.id))
                      return;
                    };
                  };
                }}

                onMouseMove={(event) => {
                  if (!mouseIsPress) return
                  event.stopPropagation();
                  onClickEvent(event, windowAction(win.id))
                }}

                onContextMenu={e => e.preventDefault()}
              >
                {(() => {
                  const owo = wmRef.current?.getWindow(win.id)

                  switch (owo?.customData?.type) {
                    case "postSearch":
                      return <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" /></svg>
                    case "post":
                    case "postGetByID":
                      return <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M780-120H180q-24.75 0-42.37-17.63Q120-155.25 120-180v-600q0-24.75 17.63-42.38Q155.25-840 180-840h600q24.75 0 42.38 17.62Q840-804.75 840-780v600q0 24.75-17.62 42.37Q804.75-120 780-120Zm-20-143H200v78h560v-78Zm-560-41h560v-78H200v78Zm0-129h560v-327H200v327Zm0 170v78-78Zm0-41v-78 78Zm0-129v-327 327Zm0 51v-51 51Zm0 119v-41 41Z" /></svg>
                    case "setting":
                      return <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px"><path d="M421-80q-14 0-25-9t-13-23l-15-94q-19-7-40-19t-37-25l-86 40q-14 6-28 1.5T155-226L97-330q-8-13-4.5-27t15.5-23l80-59q-2-9-2.5-20.5T185-480q0-9 .5-20.5T188-521l-80-59q-12-9-15.5-23t4.5-27l58-104q8-13 22-17.5t28 1.5l86 40q16-13 37-25t40-18l15-95q2-14 13-23t25-9h118q14 0 25 9t13 23l15 94q19 7 40.5 18.5T669-710l86-40q14-6 27.5-1.5T804-734l59 104q8 13 4.5 27.5T852-580l-80 57q2 10 2.5 21.5t.5 21.5q0 10-.5 21t-2.5 21l80 58q12 8 15.5 22.5T863-330l-58 104q-8 13-22 17.5t-28-1.5l-86-40q-16 13-36.5 25.5T592-206l-15 94q-2 14-13 23t-25 9H421Zm15-60h88l14-112q33-8 62.5-25t53.5-41l106 46 40-72-94-69q4-17 6.5-33.5T715-480q0-17-2-33.5t-7-33.5l94-69-40-72-106 46q-23-26-52-43.5T538-708l-14-112h-88l-14 112q-34 7-63.5 24T306-642l-106-46-40 72 94 69q-4 17-6.5 33.5T245-480q0 17 2.5 33.5T254-413l-94 69 40 72 106-46q24 24 53.5 41t62.5 25l14 112Zm44-210q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Zm0-130Z" /></svg>

                  }
                })()}
              </Button>
            })}


          </div>
          <div className={style["Right"]}>
            {workSpaceStatus.userList[userIndex].setting.appearance.clockFormat.map((e, i) => <div>{cnvFormat.clock(clock, e)}</div>)}
          </div>
        </div>
      </div>

      <Background bg={background} />

    </div >
  )
}

const Login = () => {
  const [selectUser, setSelectUser] = useState<number>(0)
  const [newAccount, setNewAccount] = useState<boolean>(false)
  const [pendingLoginIndex, setPendingLoginIndex] = useState<number | null>(null);

  const cfmPassRef = useRef<string>("")
  const newAccInfoRef = useRef<EmptyAccountOption>({
    name: "",
    id: ""
  })

  useEffect(() => {
    if (workSpaceStatus.userList.length === 0) {
      setSelectUser(-1)
      setNewAccount(true)
      return;
    }

    setSelectUser(workSpaceStatus.lastUser ?? 0)
  }, [])

  const login = useCallback((passKey: string, usr?: number) => {
    const targetIndex = usr ?? selectUser;
    const user = workSpaceStatus.userList[targetIndex];
    const psKy = user.saveInfo.user.passKey;

    const isPassCorrect = psKy ? (psKy === passKey) : true;

    if (isPassCorrect) {
      setIsLogin(true)

      userIndex = targetIndex

      setWorkSpaceStatus(e => {
        const _ = cloneDeep(e)

        _.lastUser = targetIndex
        _.autoLogin = true

        if (_.autoLogin) {
          _.rememberPassword = passKey
        } else {
          _.rememberPassword = ""
        }

        return _
      })
    } else {
    }
  }, [selectUser, workSpaceStatus])

  useEffect(() => {
    if (pendingLoginIndex !== null && workSpaceStatus.userList[pendingLoginIndex]) {

      cfmPassRef.current = "";
      newAccInfoRef.current = {
        name: "",
        id: ""
      };

      login(cfmPassRef.current, pendingLoginIndex);

      setPendingLoginIndex(null);
    }
  }, [workSpaceStatus.userList, pendingLoginIndex, login])

  const createAccount = useCallback(() => {
    const newAcc = newAccInfoRef.current;
    const cfmPass = cfmPassRef.current;

    if (!newAcc.id) {
      Kiasole.error("您的ID是跟您的良心一樣 被吃了是嗎？")
      return;
    }

    if (workSpaceStatus.userList.some(e => newAcc.id === e.saveInfo.id)) {
      Kiasole.error("有人用過這個ID了")
      return;
    }

    if (!newAcc.password && !cfmPass) {
      Kiasole.error("哦行 空密碼賬號")
    } else if (newAcc.password !== cfmPass) {
      Kiasole.error("你的密碼錯的 兩邊不一樣啊")
      return;
    }

    const newIndex = workSpaceStatus.userList.length;

    setWorkSpaceStatus(prev => {
      const _ = cloneDeep(prev)
      _.userList.push(EmptyAccount(newAcc))
      return _
    })

    setPendingLoginIndex(newIndex);

  }, [newAccInfoRef, cfmPassRef, workSpaceStatus.userList])

  useEffect(() => {
    if (workSpaceStatus.userList.length === 0) return;
    const { lastUser = 0, autoLogin: auto, rememberPassword: pass, userList } = workSpaceStatus
    const user = userList[lastUser];
    const psKy = user.saveInfo.user.passKey;
    if (auto) {
      if (!psKy || (psKy && psKy === pass)) {

        userIndex = lastUser

        setSelectUser(lastUser)

        setIsLogin(true)
      }
    }
  }, [])

  useEffect(() => {
    const { lastUser = 0, userList } = workSpaceStatus
    if (!isLogin) {
      _app.setColor("#ffffff")
    } else {
      _app.setColor(userList[lastUser].setting.appearance.color)
    }
  }, [isLogin])

  useEffect(() => {
    (async () => {
      if (!isLogin) {
        await functions.timeSleep(.5e3)
      }
      document.getElementById(style["Login"])?.classList.toggle(style["hide"], isLogin)
    })()
  }, [isLogin])

  useEffect(() => {
    const owo = Array.from(document.getElementsByClassName("passwordInput")) as HTMLInputElement[]
    owo.forEach(e => e.value = "")
  }, [selectUser, isLogin])

  const EmptyUser = useMemo(() => EmptyAccount({ name: "New Accout", id: ".w." }), [])

  return (<div id={style["Login"]} className={style["hide"]} >

    <div className={style["UserList"]}>
      <div>
        {
          workSpaceStatus.userList.map((_user, i) => {
            const { user, id } = _user.saveInfo;

            return <button
              key={`${i}_${id}`}
              className={[
                style["User"],
              ].join(" ")}
              style={{ outlineColor: i === selectUser ? _user.setting.appearance.color + "50" : "" }}
              onClick={() => { setSelectUser(i); setNewAccount(false); }}
            >
              <div className={style["Main"]}>

                <div
                  className={style["avatar"]}
                  style={{
                    backgroundImage: `url(${user.avatar.url})`,
                    backgroundPositionX: `${user.avatar.positionX ?? 50}%`,
                    backgroundPositionY: `${user.avatar.positionY ?? 50}%`,
                    backgroundSize: user.avatar.scale ? user.avatar.scale + "%" : "cover",
                    backgroundRepeat: "no-repeat"
                  }}
                />

                <div className={style["name"]} >
                  <span style={{ color: _user.setting.appearance.color }}>{user.name}</span>
                </div>

              </div>

              <div className={style["Background"]} style={{ backgroundColor: _user.setting.appearance.color }} />
            </button>
          })
        }
        <button
          key={`add_acc`}
          className={[
            style["User"],
          ].join(" ")}
          style={{
            outlineColor: -1 === selectUser ? EmptyUser.setting.appearance.color + "50" : "",
            marginTop: "50px",
          }}
          onClick={() => { setSelectUser(-1); setNewAccount(true); }}
        >
          <div className={style["Main"]}>

            <div
              className={style["avatar"]}
              style={{
                backgroundImage: `url(${EmptyUser.saveInfo.user.avatar.url})`,
                backgroundPositionX: `${EmptyUser.saveInfo.user.avatar.positionX ?? 50}%`,
                backgroundPositionY: `${EmptyUser.saveInfo.user.avatar.positionY ?? 50}%`,
                backgroundSize: EmptyUser.saveInfo.user.avatar.scale ? EmptyUser.saveInfo.user.avatar.scale + "%" : "cover",
                backgroundRepeat: "no-repeat"
              }}
            />

            <div className={style["name"]} >
              <span style={{ color: EmptyUser.setting.appearance.color }}>{EmptyUser.saveInfo.user.name}</span>
            </div>

          </div>

          <div className={style["Background"]} style={{ backgroundColor: EmptyUser.setting.appearance.color }} />
        </button>
      </div>
    </div>

    <div className={style["LoginBoard"]}>
      {
        workSpaceStatus.userList.map((_user, i) => {
          const saveInfo = _user.saveInfo
          const user = saveInfo.user
          const { avatar, name } = user
          return <div key={saveInfo.id} className={selectUser === i ? style["show"] : (selectUser > i ? style["up"] : style["down"])}>
            <div
              className={style["avatar"]}
              style={{
                backgroundImage: `url(${avatar.url ?? ""})`,
                backgroundPositionX: `${avatar.positionX ?? 50}%`,
                backgroundPositionY: `${avatar.positionY ?? 50}%`,
                backgroundSize: avatar.scale ? avatar.scale + "%" : "cover",
                backgroundRepeat: "no-repeat"
              }} />

            <div className={style["name"]}>{name}</div>

            {
              user.passKey ?
                <div className={style["input"]}>
                  <input
                    type="password"
                    name={`_LABS/E621-API/ACCOUNT/${saveInfo.id}`}
                    placeholder="Password"
                    className={"passwordInput"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.code === "NumpadEnter") {
                        if (e.currentTarget.value) {
                          login(e.currentTarget.value)
                        }
                      }
                    }}
                  />
                </div>
                :
                <div className={style["button"]}>
                  <button
                    onClick={() => {
                      login("")
                    }}
                  >{"Login"}</button>
                </div>
            }
          </div>
        })
      }
      <div key={"new_account"} className={[selectUser === -1 ? style["show"] : style["hide"], style["createAccount"]].join(" ")}>

        <h1>{"Create Account"}</h1>
        <div className={style["input"]}>
          <input
            type="text"
            placeholder="User Name"
            onInput={(e) => newAccInfoRef.current.name = e.currentTarget.value}
          />
        </div>

        <div className={style["input"]}>
          <input
            type="text"
            placeholder="User ID"
            onInput={(e) => newAccInfoRef.current.id = e.currentTarget.value}
          />
        </div>

        <div className={style["CLIP"]} />

        <div className={style["input"]}>
          <input
            type="password"
            placeholder="Password"
            onInput={(e) => newAccInfoRef.current.password = e.currentTarget.value}
          />
        </div>

        <div className={style["input"]}>
          <input
            type="password"
            placeholder="Password Again"
            onInput={(e) => cfmPassRef.current = e.currentTarget.value}
          />
        </div>

        <div className={style["CLIP"]} />

        <div className={style["input"]}>
          <span>{"Theme Color"}</span>
          <input
            type="color"
            defaultValue="#ffffff"
            onInput={(e) => newAccInfoRef.current.color = e.currentTarget.value}
          />
        </div>

        <div className={style["CLIP"]} />

        <div className={style["button"]}>
          <button
            onClick={() => {
              createAccount()
            }}
          >{"Create"}</button>
        </div>

      </div>

    </div>

    <div className={[style["Backdrop"], newAccount && style["newAccount"]].join(" ")} />

    <div className={style["Backgrounds"]}>
      {workSpaceStatus.userList.map((user, i) => <div
        key={i}
        style={{ opacity: i === selectUser ? "1" : "0" }}
        className={[style["img"],
        selectUser === i ? style["show"] : (selectUser > i ? style["up"] : style["down"])
        ].join(" ")}
      >
        <Background bg={(() => {
          const { setting, saves } = user
          const wallpaper = setting.appearance.wallpaper
          return typeof wallpaper === "number" ? saves.wallpapers[wallpaper] : wallpaper
        })()} />
      </div>)}

      <div
        key={-1}
        style={{ opacity: -1 === selectUser ? "1" : "0" }}
        className={[style["img"],
        selectUser === -1 ? style["show"] : style["hide"],
        ].join(" ")}
      >
        <Background bg={(() => {
          const { setting, saves } = EmptyUser
          const wallpaper = setting.appearance.wallpaper
          return typeof wallpaper === "number" ? saves.wallpapers[wallpaper] : wallpaper
        })()} />
      </div>
    </div>

  </div >)
}

export default function () {
  [workSpaceStatus, setWorkSpaceStatus] = useLocalStorage<workSpaceType.defaul>("_LABS/E621-API/workSpaceStatus", defaultStatus);
  [isLogin, setIsLogin] = useState<boolean>(false);

  useEffect(() => {
    const dragoverEvent = (e: DragEvent) => e.preventDefault();
    const dropEvent = (e: DragEvent) => {

      if (!e.dataTransfer) return;

      const itemdata = e.dataTransfer.getData(e621Type.DragItemType.appname)
      const item = e.dataTransfer.items[0]

      if (itemdata) {
        const item: e621Type.DragItemType.defaul = JSON.parse(itemdata)
        const { data, type } = item
        switch (type) {
          case "post": {
            const id = data.id;
            const winID = `post_get_by_id-${id}`;
            if (wmRef.current?.getWindow(winID)) {
              wmRef.current?.bringToFront(winID)
              wmRef.current?.getWindow(winID)?.setRect({
                left: e.clientX - 400,
                top: e.clientY - 300,
              }, "px")
            } else {
              wmRef.current?.createWindow({
                left: e.clientX - 400,
                top: e.clientY - 300,
                id: winID,
                title: `Post Get By ID [ ${id} ]`,
                children: <windowsType.postGetByID id={`${id}`} />,
                customData: {
                  type: "postGetByID",
                  data: {
                    currentId: id,
                    status: "success",
                    fetchedPost: data
                  }
                }
              });
            }
            break;
          };
          case "postSearch": {
            const createAt = new Date().getTime()
            wmRef.current?.createWindow({
              left: e.clientX - 400,
              top: e.clientY - 300,
              id: `post_search-${createAt}`,
              title: `Post Search [ ${createAt} ]`,
              children: <windowsType.postSearch id={`${createAt}`} />,
              customData: {
                type: "postSearch",
                data
              }
            })
            break;
          };
          case "tag": {
            if (data.action === "=") {
              const createAt = new Date().getTime()
              wmRef.current?.createWindow({
                left: e.clientX - 400,
                top: e.clientY - 300,
                id: `post_search-${createAt}`,
                title: `Post Search [ ${createAt} ]`,
                children: <windowsType.postSearch id={`${createAt}`} />,
                customData: {
                  type: "postSearch",
                  data: {
                    nowPage: 1,
                    pageCache: [],
                    searchTags: [data.tag],
                  }
                }
              })
            }
            break;
          };
        };
      } else if (item) {
        if (item.kind !== "string") return;

      }
    }
    document.addEventListener("dragover", dragoverEvent)
    document.addEventListener("drop", dropEvent)

    return () => {
      document.removeEventListener("dragover", dragoverEvent)
      document.removeEventListener("drop", dropEvent)
    }
  }, [])

  return (
    <>
      <div id={style["Frame"]} >

        {!isLogin ? <Login key={userIndex} /> : <></>}
        {isLogin ? <Desktop key={userIndex} /> : <></>}

      </div >
    </>
  );
}