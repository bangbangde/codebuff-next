import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const CQ_ASSET_PATTERN = /^cq-asset:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/**
 * 将 assetId 解析为可访问的 URL。
 * 草稿预览传入 admin 鉴权路由解析器；公开页面传入公开路由解析器。
 */
export type AssetUrlResolver = (assetId: string) => string | null;

// 与 react-markdown 的 defaultUrlTransform 保持一致的安全协议白名单。
const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i;

/**
 * react-markdown 的 defaultUrlTransform 只放行 http(s)/ircs/mailto/xmpp 协议，
 * 会把自定义的 cq-asset:// 协议 URL 清空为空字符串，导致解析器拿不到原始 URL。
 * 这里放行 cq-asset:// 协议，其余交给默认安全逻辑处理。
 */
function urlTransform(url: string) {
  if (url.startsWith("cq-asset://")) {
    return url;
  }

  const colon = url.indexOf(":");
  const questionMark = url.indexOf("?");
  const numberSign = url.indexOf("#");
  const slash = url.indexOf("/");

  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    SAFE_PROTOCOL.test(url.slice(0, colon))
  ) {
    return url;
  }

  return "";
}

export function MarkdownRenderer({
  children,
  resolveAssetUrl,
}: {
  children: string;
  resolveAssetUrl?: AssetUrlResolver;
}) {
  const components: Components = {
    // 页面标题由页面模板负责；正文中的一级标题降为二级，避免重复主标题。
    h1: ({ node: _node, ...props }) => <h2 {...props} />,
    ...(resolveAssetUrl
      ? {
          // react-markdown v10 通过 passNode 会把 hast node 对象作为 prop 传入，
          // 必须显式排除 node，否则对象会泄漏到 DOM。
          img: ({ src, alt, node: _node, ...rest }) => {
            const srcStr = typeof src === "string" ? src : undefined;
            const resolved = resolveCqAsset(srcStr, resolveAssetUrl);
            // eslint-disable-next-line @next/next/no-img-element
            return <img alt={alt} src={resolved ?? srcStr} {...rest} />;
          },
          a: ({ href, children: linkChildren, node: _node, ...rest }) => {
            const resolved = resolveCqAsset(href, resolveAssetUrl);
            return (
              <a href={resolved ?? href} {...rest}>
                {linkChildren}
              </a>
            );
          },
        }
      : {}),
  };

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      urlTransform={urlTransform}
      components={components}
    >
      {children}
    </Markdown>
  );
}

function resolveCqAsset(
  url: string | undefined,
  resolver: AssetUrlResolver,
): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(CQ_ASSET_PATTERN);

  if (!match) {
    return null;
  }

  return resolver(match[1]);
}
