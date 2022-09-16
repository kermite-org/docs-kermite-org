import {
  asyncRerender,
  css,
  domStyled,
  effectOnMount,
  FC,
  jsx,
  render,
  rerender,
  useRef,
  useState,
} from 'alumina';
import docC00AboutKermite from './c00-about-kermite.fdoc';
import docC0DataStructure from './c0-data-structure.fdoc';
import docC1aMainViewOperation from './c1a-main-view-operation.fdoc';
import docC1bMainViewDetail from './c1b-main-view-detail.fdoc';
import docC2LayoutEditor from './c2-layout-editor.fdoc';
import docC3FirmwareConfiguration from './c3-firmware-configuration.fdoc';
import docC4UsageByPurpose from './c4-usage-by-purpose.fdoc';
import { extraStylesDefinition } from './extraStyles';

type IDocNodeType =
  | 'chapter'
  | 'section'
  | 'text'
  | 'image'
  | 'table'
  | 'head1'
  | 'head2'
  | 'rawHtml';

type IDocSourceNode = {
  nodeType: IDocNodeType;
  attrs?: Record<string, string> | string;
  contentLines?: string[];
};

const allDocNodeTypes: IDocNodeType[] = [
  'chapter',
  'section',
  'text',
  'image',
  'table',
  'head1',
  'head2',
  'rawHtml',
];

type IDocNode_Chapter = {
  nodeType: 'chapter';
  title: string;
  anchorId: string;
};

type IDocNode_Section = {
  nodeType: 'section';
  title: string;
  anchorId: string;
};

type IDocNode_Text = {
  nodeType: 'text';
  lines: string[];
};

type IDcoNode_Image = {
  nodeType: 'image';
  url: string;
  sizeSpec?: 'half';
  remark?: string;
};

type IDocNode_Table = {
  nodeType: 'table';
  rows: [string, string][];
};

type IDocNode_Head1 = {
  nodeType: 'head1';
  caption: string;
  anchorId: string;
};

type IDocNode_Head2 = {
  nodeType: 'head2';
  caption: string;
  anchorId: string;
};

type IDocNode_RawHtml = {
  nodeType: 'rawHtml';
  content: string;
};

type IDocNode =
  | IDocNode_Chapter
  | IDocNode_Section
  | IDocNode_Text
  | IDcoNode_Image
  | IDocNode_Table
  | IDocNode_Head1
  | IDocNode_Head2
  | IDocNode_RawHtml;

type DocNodeTypeMap = {
  chapter: IDocNode_Chapter;
  section: IDocNode_Section;
  text: IDocNode_Text;
  image: IDcoNode_Image;
  table: IDocNode_Table;
  head1: IDocNode_Head1;
  head2: IDocNode_Head2;
  rawHtml: IDocNode_RawHtml;
};

type IPageSource = {
  chapterTitle: string;
  pageId: string;
  docNodes: IDocNode[];
};

//http://crc32.nichabi.com/javascript-function.php
const calculateCrc32ForString = (function () {
  const table: number[] = [];
  for (var i = 0; i < 256; i++) {
    var c = i;
    for (var j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c);
  }

  return function (str: string, _crc?: number) {
    str = unescape(encodeURIComponent(str));
    let crc = _crc || 0;
    crc = crc ^ -1;
    for (var i = 0; i < str.length; i++) {
      var y = (crc ^ str.charCodeAt(i)) & 0xff;
      crc = (crc >>> 8) ^ table[y];
    }
    crc = crc ^ -1;
    return crc >>> 0;
  };
})();

function getHeaderTextHashed(text: string): string {
  return calculateCrc32ForString(text).toString(16).padStart(8, '0');
}

function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitStringAtCharacterFirstFound(
  text: string,
  char: string
): [string, string | undefined] {
  const pos = text.indexOf(char);
  if (pos >= 0) {
    return [text.slice(0, pos), text.slice(pos + 1)];
  } else {
    return [text, undefined];
  }
}

function cleanupObject(source: any) {
  const dest: any = {};
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value !== undefined) {
      dest[key] = source[key];
    }
  });
  return dest;
}

function debounce<T extends any[]>(
  targetProc: (...args: T) => void,
  ms: number
) {
  let timerId: NodeJS.Timeout | undefined;
  return (...args: T) => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = undefined;
    }
    timerId = setTimeout(() => targetProc(...args), ms);
  };
}

namespace nsDocLoader {
  function parseAttrsText(text: string): Record<string, string> | string {
    if (text.includes('=')) {
      return Object.fromEntries(
        text
          .split(';')
          .filter((it) => !!it)
          .map((it) => it.trim())
          .map(
            (it) =>
              splitStringAtCharacterFirstFound(it, '=') as any as [
                string,
                string
              ][]
          )
      );
    } else {
      return text;
    }
  }

  function convertDocSourceNodeToDocNode(source: IDocSourceNode): IDocNode {
    if (source.nodeType === 'chapter') {
      const title = source.attrs as string;
      return {
        nodeType: 'chapter',
        title,
        anchorId: getHeaderTextHashed(title),
      };
    } else if (source.nodeType === 'section') {
      const title = source.attrs as string;
      return {
        nodeType: 'section',
        title,
        anchorId: getHeaderTextHashed(title),
      };
    } else if (source.nodeType === 'text') {
      return {
        nodeType: 'text',
        lines: source.contentLines!,
      };
    } else if (source.nodeType === 'image') {
      const attrs = source.attrs as {
        url: string;
        size?: 'half';
        remark?: string;
      };
      return cleanupObject({
        nodeType: 'image',
        url: attrs.url,
        sizeSpec: attrs.size,
        remark: attrs.remark,
      });
    } else if (source.nodeType === 'table') {
      return {
        nodeType: 'table',
        rows: source.contentLines!.map((it) => it.split('|')) as [
          string,
          string
        ][],
      };
    } else if (source.nodeType === 'head1') {
      const caption = source.attrs as string;
      return {
        nodeType: 'head1',
        caption,
        anchorId: getHeaderTextHashed(caption),
      };
    } else if (source.nodeType === 'head2') {
      const caption = source.attrs as string;
      return {
        nodeType: 'head2',
        caption,
        anchorId: getHeaderTextHashed(caption),
      };
    } else if (source.nodeType === 'rawHtml') {
      return {
        nodeType: 'rawHtml',
        content: source.contentLines!.join('\n'),
      };
    }
    throw new Error(`invalid nodeType ${source.nodeType}`);
  }

  function parseManuscriptTextToDocSourceNodes(
    sourceText: string
  ): IDocSourceNode[] {
    const docSourceNodes: IDocSourceNode[] = [];

    const lines = sourceText.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('#')) {
        const [headText, attrsText] = splitStringAtCharacterFirstFound(
          line,
          ' '
        );
        const _nodeType = headText.slice(1);

        if (_nodeType.charAt(0) === '-') {
          continue;
        }
        const nodeType = _nodeType as IDocNodeType;
        if (!allDocNodeTypes.includes(nodeType)) {
          throw new Error(`invalid node type ${nodeType}`);
        }

        const attrs = (attrsText && parseAttrsText(attrsText)) || undefined;

        const node: IDocSourceNode = attrs ? { nodeType, attrs } : { nodeType };
        docSourceNodes.push(node);
      } else if (line) {
        const lastNode = docSourceNodes[docSourceNodes.length - 1];
        if (lastNode.contentLines) {
          lastNode.contentLines.push(line);
        } else {
          lastNode.contentLines = [line];
        }
      }
    }
    return docSourceNodes;
  }

  function patchChapterAnchorIds(nodes: IDocNode[]) {
    const anchorIdCounts: Record<string, number> = {};

    let pageId = '';

    for (const node of nodes) {
      if ('anchorId' in node) {
        if (node.nodeType === 'chapter') {
          pageId = node.anchorId;
        } else {
          node.anchorId = `${pageId}/${node.anchorId}`;
        }
        const { anchorId } = node;
        if (anchorIdCounts[anchorId] === undefined) {
          anchorIdCounts[anchorId] = 1;
        } else {
          const count = anchorIdCounts[anchorId] + 1;
          node.anchorId = `${node.anchorId}${count}`;
          anchorIdCounts[anchorId] = count;
        }
      }
    }
  }

  function readManuscriptDocument(sourceText: string): IPageSource {
    const docSourceNodes = parseManuscriptTextToDocSourceNodes(sourceText);
    const nodes = docSourceNodes.map(convertDocSourceNodeToDocNode);
    patchChapterAnchorIds(nodes);
    const chapterNode = nodes.find(
      (it) => it.nodeType === 'chapter'
    ) as IDocNode_Chapter;
    return {
      chapterTitle: chapterNode.title,
      pageId: getHeaderTextHashed(chapterNode.title),
      docNodes: nodes,
    };
  }

  export function readManuscriptDocuments(
    documentSourceTexts: string[]
  ): IPageSource[] {
    const chapterFullNodes = documentSourceTexts.map(readManuscriptDocument);
    return chapterFullNodes;
  }
}

function createStore() {
  const documentSources = [
    docC00AboutKermite,
    docC0DataStructure,
    docC1aMainViewOperation,
    docC1bMainViewDetail,
    docC2LayoutEditor,
    docC3FirmwareConfiguration,
    docC4UsageByPurpose,
  ];
  const pageSources = nsDocLoader.readManuscriptDocuments(documentSources);
  let pageIndex = -1;

  const tocExpandFlags: Record<string, boolean> = {};

  return {
    pageSources,
    tocExpandFlags,
    get docNodes() {
      return pageSources[pageIndex]?.docNodes || [];
    },
    get currentPageId() {
      return pageSources[pageIndex]?.pageId;
    },
    selectPageById(pageId: string) {
      const index = pageSources.findIndex((it) => it.pageId === pageId);
      if (index >= 0) {
        if (pageIndex >= 0) {
          tocExpandFlags[pageSources[pageIndex].pageId] = false;
        }
        pageIndex = index;
        const page = pageSources[index];
        for (const key in tocExpandFlags) {
          tocExpandFlags[key] = false;
        }
        tocExpandFlags[page.pageId] = true;
      } else {
        console.error(`cannot find page for ${pageId}`);
        if (pageIndex === -1) {
          pageIndex = 0;
        }
      }
    },
  };
}
const store = createStore();

const initialPageScrollDriver = new (class {
  private loadedImageCount = 0;
  private numImagesToLoad = 0;
  private scrollFn: (() => void) | undefined;
  setNumInitialImagesToLoad(n: number) {
    // console.log('num', n);
    this.numImagesToLoad = n;
  }

  setScrollFn(fn: () => void) {
    this.scrollFn = fn;
  }

  onImageLoaded = () => {
    this.loadedImageCount++;
    if (this.loadedImageCount <= this.numImagesToLoad) {
      // console.log(`scroll ${this.loadedImageCount}`);
      this.scrollFn?.();
    }
  };
})();

async function scrollPageToAnchor(anchorId: string, smooth: boolean) {
  if (smooth) {
    const domMainColumnContent = document.getElementById(
      'dom-main-column-content'
    ) as HTMLElement;
    domMainColumnContent.style.scrollBehavior = 'smooth';
    location.hash = anchorId;
    await delayMs(1);
    domMainColumnContent.style.scrollBehavior = 'auto';
  } else {
    location.hash = anchorId;
  }
}

async function navigateToAnchor(anchorId: string) {
  location.hash = '';
  const [newPageId] = anchorId.split('/');
  if (newPageId !== store.currentPageId) {
    // console.log(`change page ${newPageId}`);
    store.selectPageById(newPageId);
    await delayMs(1);
    await scrollPageToAnchor(anchorId, false);
  } else {
    await scrollPageToAnchor(anchorId, true);
  }
}

async function navigateToAnchorForInitialPageLoad(anchorId: string) {
  const doScrollToAnchor = () => {
    location.hash = '';
    scrollPageToAnchor(anchorId, true);
  };

  const [newPageId] = anchorId.split('/');
  if (newPageId !== store.currentPageId) {
    store.selectPageById(newPageId);
  }
  const { docNodes } = store;
  const numImages = docNodes.filter((it) => it.nodeType === 'image').length;
  if (numImages > 0) {
    initialPageScrollDriver.setNumInitialImagesToLoad(numImages);
    initialPageScrollDriver.setScrollFn(doScrollToAnchor);
  } else {
    doScrollToAnchor();
  }
}

function initializePage() {
  const { hash } = location;
  if (hash) {
    const anchorId = decodeURI(hash.slice(1));
    navigateToAnchorForInitialPageLoad(anchorId);
  } else {
    store.selectPageById(store.pageSources[0].pageId);
  }
}

namespace nsView {
  const mqUnderMedium = `@media screen and (max-width: 640px)`;
  const mqOverMedium = `@media screen and (min-width: 640px)`;

  const colors = {
    white: '#fff',
    mainText: '#444',
    topBarBg: '#6cf',
    bottomBarBg: '#777',
    navigationFg: '#369',
    navigationHover: '#2221',
    sideBarSplitterEdge: '#8888',
    spNavigationPanelBg: '#cef',
    chapterHeader: '#f95',
    sectionHeader: '#46a',
    head2Caption: '#359',
    tableBorder: '#aaa8',
    tableZebra: '#aaa2',
  };

  const cssDisplayPcOnly = css`
    ${mqUnderMedium} {
      display: none;
    }
  `;

  const cssDisplaySpOnly = css`
    ${mqOverMedium} {
      display: none;
    }
  `;

  const NodeView_Chapter: FC<{ node: IDocNode_Chapter }> = ({
    node: { title, anchorId },
  }) => {
    return (
      <div
        class="chapter-header"
        id={anchorId}
        onClick={() => navigateToAnchor(anchorId)}
      >
        {title}
      </div>
    );
  };

  const NodeView_Section: FC<{ node: IDocNode_Section }> = ({
    node: { title, anchorId },
  }) => {
    return (
      <div
        class="section-header"
        id={anchorId}
        onClick={() => navigateToAnchor(anchorId)}
      >
        {title}
      </div>
    );
  };

  const NodeView_Text: FC<{ node: IDocNode_Text }> = ({ node: { lines } }) => {
    return (
      <div class="text-block">
        {lines.map((line) => (
          <p class="text">{line}</p>
        ))}
      </div>
    );
  };

  const NodeView_Image: FC<{ node: IDcoNode_Image }> = ({
    node: { url, sizeSpec, remark },
  }) => {
    return (
      <div class="image-block">
        <img
          class={['image', sizeSpec === 'half' && '--half']}
          src={url}
          onLoad={initialPageScrollDriver.onImageLoaded}
        />
        <div class="image-remark" if={remark}>
          {remark}
        </div>
      </div>
    );
  };

  const NodeView_Table: FC<{ node: IDocNode_Table }> = ({ node: { rows } }) => {
    return (
      <table class="table">
        <tbody>
          {rows.map((row) => (
            <tr>
              <td>{row[0]}</td>
              <td>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const NodeView_Head1: FC<{ node: IDocNode_Head1 }> = ({
    node: { caption, anchorId },
  }) => {
    return (
      <div
        class="head1"
        id={anchorId}
        onClick={() => navigateToAnchor(anchorId)}
      >
        {caption}
      </div>
    );
  };

  const NodeView_Head2: FC<{ node: IDocNode_Head2 }> = ({
    node: { caption, anchorId },
  }) => {
    return (
      <div
        class="head2"
        id={anchorId}
        onClick={() => navigateToAnchor(anchorId)}
      >
        {caption}
      </div>
    );
  };

  const NodeView_RawHtml: FC<{ node: IDocNode_RawHtml }> = ({
    node: { content },
  }) => {
    const wrapperDivRef = useRef<HTMLElement>();
    effectOnMount(() => {
      const wrapperDiv = wrapperDivRef.current!;
      wrapperDiv.innerHTML = content;
    });
    return <div ref={wrapperDivRef} />;
  };

  const nodeComponentMap: {
    [K in IDocNodeType]: FC<{ node: DocNodeTypeMap[K] }>;
  } = {
    chapter: NodeView_Chapter,
    section: NodeView_Section,
    text: NodeView_Text,
    image: NodeView_Image,
    table: NodeView_Table,
    head1: NodeView_Head1,
    head2: NodeView_Head2,
    rawHtml: NodeView_RawHtml,
  };

  function renderNode<TNode extends IDocNode>(node: TNode) {
    const Component = nodeComponentMap[node.nodeType] as FC<{ node: TNode }>;
    return <Component node={node} />;
  }

  const ChapterToc: FC<{ pageSource: IPageSource }> = ({ pageSource }) => {
    const { pageId } = pageSource;
    const isOpen = store.tocExpandFlags[pageId];
    const toggleOpen = (e: MouseEvent) => {
      store.tocExpandFlags[pageId] = !store.tocExpandFlags[pageId];
      e.stopPropagation();
    };

    const sectionNodes = pageSource.docNodes.filter(
      (it) => it.nodeType === 'section'
    ) as IDocNode_Section[];
    return domStyled(
      <div>
        <div
          class="chapter-bar"
          onClick={() => navigateToAnchor(pageSource.pageId)}
        >
          <i class="material-icons">article</i>
          {pageSource.chapterTitle}
          <i class="material-icons arrow" onClick={toggleOpen}>
            {isOpen ? 'expand_less' : 'chevron_right'}
          </i>
        </div>
        <ul if={isOpen}>
          {sectionNodes.map((node) => (
            <li onClick={() => navigateToAnchor(node.anchorId)}>
              {node.title}
            </li>
          ))}
        </ul>
      </div>,
      css`
        color: ${colors.navigationFg};

        > .chapter-bar {
          display: flex;
          align-items: center;
          cursor: pointer;
          &:hover {
            background: ${colors.navigationHover};
          }
          transition: all 0.3s;

          i.arrow {
            font-size: 18px;
            margin-left: auto;
            user-select: none;
          }
          padding: 4px 0;
        }

        > ul {
          display: flex;
          flex-direction: column;
          > li {
            font-size: 15px;
            padding: 2px 0;
            cursor: pointer;
            margin-left: 20px;
            &:hover {
              background: ${colors.navigationHover};
            }
            transition: all 0.3s;
          }
        }
      `
    );
  };

  const SideColumnContent: FC = () => {
    return domStyled(
      <div>
        {store.pageSources.map((pageSource) => (
          <ChapterToc pageSource={pageSource} />
        ))}
      </div>,
      css`
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `
    );
  };

  const BottomBar: FC = () => {
    return domStyled(
      <div class="bottom-bar">copyright©2022 yahiro, all rights reserved.</div>,
      css`
        height: 26px;
        background: ${colors.bottomBarBg};
        color: ${colors.white};
        font-size: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
      `
    );
  };

  const MainColumnContent: FC = () => {
    const { docNodes } = store;
    return domStyled(
      <div id="dom-main-column-content" class={extraStylesDefinition}>
        {docNodes.map(renderNode)}
      </div>,
      css`
        width: 100%;
        height: 100%;
        overflow-y: auto;
        scroll-padding-top: 20px;
        padding: 20px;

        display: flex;
        flex-direction: column;

        > * + * {
          margin-top: 12px;
        }

        > .chapter-header {
          background: ${colors.chapterHeader};
          color: ${colors.white};
          font-size: 1.7rem;
          cursor: pointer;
          padding: 4px 10px;
        }

        > .section-header {
          background: ${colors.sectionHeader};
          font-size: 1.3rem;
          color: ${colors.white};
          margin-top: 30px;
          margin-bottom: 4px;
          cursor: pointer;
          padding: 2px 8px;
        }

        > .head2 {
          color: ${colors.head2Caption};
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
        }

        > .chapter-header + .section-header {
          margin-top: 20px;
        }

        > :not(.section-header) + .head2 {
          margin-top: 20px;
        }

        > .head2 + .text-block {
          margin-top: 6px;
        }

        > .image-block + .image-block {
          margin-top: 20px;
        }

        > .text-block {
        }

        > .image-block {
          max-width: 100%;

          > .image {
            max-width: 100%;

            &.--half {
              width: 360px;
            }
          }
          > .image-remark {
            font-size: 0.8rem;
          }
        }

        > .table {
          border-collapse: collapse;

          tr:nth-child(even) {
            background: ${colors.tableZebra};
          }

          td {
            border: solid 1px ${colors.tableBorder};
            padding: 8px;
          }
          td:first-child {
            ${mqOverMedium} {
              white-space: nowrap;
            }
            ${mqUnderMedium} {
              width: 30%;
            }
          }
        }

        p {
          line-height: 1.5rem;
        }

        a {
          &:hover {
            text-decoration: underline;
          }
        }

        ${mqOverMedium} {
          padding: 20px 30px;

          > .chapter-header {
            font-size: 2.2rem;
          }

          > .section-header {
            font-size: 1.7rem;
          }

          > .head2 {
            font-size: 1.2rem;
          }
        }
      `
    );
  };

  const MobileNavigationMenu: FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen((prev) => !prev);

    const onPageLinkClick = (pageId: string) => {
      navigateToAnchor(pageId);
      setIsOpen(false);
    };

    const fgColor = colors.navigationFg;
    return domStyled(
      <div>
        <div class="menu-button" onClick={toggleOpen}>
          <i class="material-icons">menu</i>
        </div>
        <div class="overlay" if={isOpen} onClick={() => setIsOpen(false)} />
        <div class="menu-panel" if={isOpen}>
          <ul>
            {store.pageSources.map((pageSource) => (
              <li onClick={() => onPageLinkClick(pageSource.pageId)}>
                {pageSource.chapterTitle}
              </li>
            ))}
          </ul>
        </div>
      </div>,
      css`
        position: relative;
        > .menu-button {
          color: ${colors.white};
          border: solid 1px ${colors.white};
          width: 32px;
          height: 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }

        > .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
        }

        > .menu-panel {
          position: absolute;
          top: 32px;
          left: 0;
          border: solid 1px ${fgColor};
          border-radius: 2px;
          background: ${colors.white};
          width: 240px;
          max-height: 70vh;
          overflow: auto;
          background: ${colors.spNavigationPanelBg};
          padding: 8px;

          > ul {
            display: flex;
            flex-direction: column;
            gap: 8px;

            > li {
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: ${fgColor};
              border: solid 1px ${fgColor};
              border-radius: 2px;
              padding: 10px;
              cursor: pointer;
              background: ${colors.white};
              &:hover {
                background: ${colors.navigationHover};
              }
              transition: all 0.3s;
              &:after {
                font-family: 'Material Icons';
                content: 'keyboard_arrow_right';
                font-size: 24px;
              }
            }
          }
        }
      `
    );
  };

  export const SiteRoot: FC = () => {
    // console.log('render');
    return domStyled(
      <div>
        <div class="top-bar">
          <MobileNavigationMenu class="menu" />
          <h1>Kermite ユーザーガイド</h1>
        </div>
        <div class="main-row">
          <div class="side-column">
            <SideColumnContent />
          </div>
          <div class={'main-column'}>
            <MainColumnContent />
          </div>
        </div>
        <BottomBar />
      </div>,

      css`
        height: 100%;
        overflow-y: hidden;

        color: ${colors.mainText};

        > .top-bar {
          height: 55px;
          background: ${colors.topBarBg};
          > h1 {
            color: ${colors.white};
            font-size: 1.7rem;
            white-space: nowrap;
          }
          padding-left: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        > .top-bar > .menu {
          ${cssDisplaySpOnly}
        }

        > .main-row {
          height: calc(100% - 55px - 26px);
          display: flex;

          > .side-column {
            width: 280px;
            border-right: solid 1px ${colors.sideBarSplitterEdge};
            flex-shrink: 0;
            overflow-y: scroll;
            ${cssDisplayPcOnly};
          }

          > .main-column {
            width: calc(100%-280px);
            overflow-x: hidden;
          }
        }

        ${mqOverMedium} {
          > .top-bar > h1 {
            font-size: 2rem;
          }
        }
      `
    );
  };
}

window.onload = async () => {
  console.log('kermite-user-guide 220916');
  initializePage();
  render(() => <nsView.SiteRoot />, document.getElementById('app'));
  window.addEventListener('resize', debounce(asyncRerender, 200));
};
