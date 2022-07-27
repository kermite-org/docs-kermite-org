import { css, domStyled, FC, jsx, render } from 'alumina';
import manuscriptText from './manuscript.fdoc';

type IDocNodeType =
  | 'chapter'
  | 'section'
  | 'text'
  | 'image'
  | 'table'
  | 'head1'
  | 'head2';

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

type IDocNode =
  | IDocNode_Chapter
  | IDocNode_Section
  | IDocNode_Text
  | IDcoNode_Image
  | IDocNode_Table
  | IDocNode_Head1
  | IDocNode_Head2;

type DocNodeTypeMap = {
  chapter: IDocNode_Chapter;
  section: IDocNode_Section;
  text: IDocNode_Text;
  image: IDcoNode_Image;
  table: IDocNode_Table;
  head1: IDocNode_Head1;
  head2: IDocNode_Head2;
};

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

function convertDocSourceNodeToDocNode(source: IDocSourceNode): IDocNode {
  if (source.nodeType === 'chapter') {
    const title = source.attrs as string;
    return {
      nodeType: 'chapter',
      title,
      anchorId: title,
    };
  } else if (source.nodeType === 'section') {
    const title = source.attrs as string;
    return {
      nodeType: 'section',
      title,
      anchorId: title,
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
      anchorId: caption,
    };
  } else if (source.nodeType === 'head2') {
    const caption = source.attrs as string;
    return {
      nodeType: 'head2',
      caption,
      anchorId: caption,
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
      const [headText, attrsText] = splitStringAtCharacterFirstFound(line, ' ');
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

function fixAnchorIdDuplication(nodes: IDocNode[]) {
  const anchorIdCounts: Record<string, number> = {};

  for (const node of nodes) {
    if ('anchorId' in node) {
      const { anchorId } = node;
      if (anchorIdCounts[anchorId] === undefined) {
        anchorIdCounts[anchorId] = 1;
      } else {
        const count = anchorIdCounts[anchorId] + 1;
        node.anchorId = `${node.anchorId}(${count})`;
        anchorIdCounts[anchorId] = count;
      }
    }
  }
}

function readManuscriptDocument(sourceText: string): IDocNode[] {
  const docSourceNodes = parseManuscriptTextToDocSourceNodes(sourceText);
  const nodes = docSourceNodes.map(convertDocSourceNodeToDocNode);
  fixAnchorIdDuplication(nodes);
  return nodes;
}

const NodeView_Chapter: FC<{ node: IDocNode_Chapter }> = ({
  node: { title, anchorId },
}) => {
  return (
    <div class="chapter-header" id={anchorId}>
      {title}
    </div>
  );
};

const NodeView_Section: FC<{ node: IDocNode_Section }> = ({
  node: { title, anchorId },
}) => {
  return (
    <div class="section-header" id={anchorId}>
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
      <img class={['image', sizeSpec === 'half' && '--half']} src={url} />
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
    <div class="head1" id={anchorId}>
      {caption}
    </div>
  );
};

const NodeView_Head2: FC<{ node: IDocNode_Head2 }> = ({
  node: { caption, anchorId },
}) => {
  return (
    <div class="head2" id={anchorId}>
      {caption}
    </div>
  );
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
};

function renderNode<TNode extends IDocNode>(node: TNode) {
  const Component = nodeComponentMap[node.nodeType] as FC<{ node: TNode }>;
  return <Component node={node} />;
}

const store = {
  docNodes: readManuscriptDocument(manuscriptText),
};

const SideColumnContent: FC = () => {
  const listedNodes = store.docNodes.filter(
    (it) => it.nodeType === 'chapter' || it.nodeType === 'section'
  ) as (IDocNode_Chapter | IDocNode_Section)[];
  return domStyled(
    <div>
      <ul>
        {listedNodes.map((node) => (
          <li class={node.nodeType === 'section' && '--with-indent'}>
            <a href={`#${node.anchorId}`}>{node.title}</a>
          </li>
        ))}
      </ul>
    </div>,
    css`
      position: sticky;
      top: 100px;
      > ul > li.--with-indent {
        margin-left: 10px;
      }
    `
  );
};

const BottomBar: FC = () => {
  return domStyled(
    <div class="bottom-bar">
      copyright(c)2021-2022 yahiro, all rights reserved.
    </div>,
    css`
      height: 26px;
      background: #777;
      color: #fff;
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
    <div id="dom-main-column-content">{docNodes.map(renderNode)}</div>,
    css`
      height: 100%;
      overflow-y: auto;
      scroll-behavior: smooth;
      scroll-padding-top: 20px;

      padding: 20px;

      display: flex;
      flex-direction: column;
      gap: 20px;

      > .chapter-header {
        min-height: 300px;
        border: solid 1px #888;
        display: grid;
        place-items: center;
        font-size: 4rem;
      }

      > .section-header {
        background: orange;
        font-size: 2rem;
        color: #fff;
        margin-top: 20px;
      }

      > .text-block {
      }

      > .image-block {
        max-width: 100%;

        > .image {
          width: 100%;

          &.--half {
            width: 60%;
          }
        }
      }

      > .table {
      }

      > .head1 {
      }

      > .head2 {
      }
    `
  );
};

const SiteRoot: FC = () => {
  console.log('render');
  return domStyled(
    <div>
      <div class="top-bar">Kermite ユーザーガイド</div>
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
      > .top-bar {
        height: 55px;
        background: #08f8;
        color: #fff;
        font-size: 2rem;
        padding-left: 10px;
        white-space: nowrap;
        display: flex;
        align-items: center;
      }

      > .main-row {
        height: calc(100vh - 55px - 26px);
        display: flex;

        > .side-column {
          width: 240px;
          border: solid 1px #888;
          flex-shrink: 0;
        }

        > .main-column {
          flex-grow: 1;
        }
      }
    `
  );
};

function navigateToAnchorPositionAfterInitialRender() {
  const { hash } = location;
  if (hash) {
    const domMainColumnContent = document.getElementById(
      'dom-main-column-content'
    ) as HTMLElement;
    domMainColumnContent.style.scrollBehavior = 'auto';
    location.hash = '';
    location.hash = hash;
    setTimeout(() => {
      domMainColumnContent.style.scrollBehavior = 'smooth';
    }, 1);
  }
}

window.onload = async () => {
  render(() => <SiteRoot />, document.getElementById('app'));
  navigateToAnchorPositionAfterInitialRender();
};
