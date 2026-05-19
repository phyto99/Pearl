import React, { useState, useRef } from "react";
import * as timeago from "timeago.js";
import useSound from "use-sound";
import classNames from "classnames";
import { useRouter } from "next/router";
import useStore from "../store";
import { loadPostFromServer } from "../loadPostFromServer.js";
import MapPreviewCanvas from "../simulation/MapPreviewCanvas";

export const BrowsePostLink = ({ post: initPost, isReply, isParent }) => {
  const router = useRouter();
  const [post] = useState(initPost);
  const expandedPostId = useStore((state) => state.expandedPostId);
  const expanded = expandedPostId === post.id;
  const mobile = typeof window !== 'undefined' ? window.innerWidth <= 700 : false;

  const [play] = useSound("/media/delete.wav", { volume: 0.15 });

  // Preview state: null = not fetched, false = fetching, object = ready
  const [previewData, setPreviewData] = useState(null);
  const [hovering, setHovering] = useState(false);
  const fetchedRef = useRef(false);

  let displayTime = new Date(post.createdAt).toLocaleDateString();
  const msAgo = new Date().getTime() - new Date(post.createdAt).getTime();
  if (msAgo < 7 * 24 * 60 * 60 * 1000) displayTime = timeago.format(post.createdAt);

  const thumbSrc = post.thumbnail || `https://storage.googleapis.com/sandspiel-studio/creations/${post.id}.png`;

  const handleClick = (e) => {
    if (expanded) return;
    play();
    useStore.setState({ post });
    loadPostFromServer(post.id);
    window.history.replaceState({}, document.title, `/post/${post.id}`);
    if (mobile) window.scrollTo(0, 0);
    e.preventDefault();
  };

  const handleMouseEnter = () => {
    if (post.placeholder) return;
    setHovering(true);
    // Fetch full map data lazily on first hover
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetch(`/api/maps/${post.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setPreviewData(data); })
        .catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovering(false);
  };

  const showPreview = hovering && previewData;

  return (
    <div className="post-family">
      <div
        className={classNames("post", {
          selected: expanded,
          placeholder: post.placeholder,
        })}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <a className="postThumbnail" style={{ position: 'relative', display: 'block' }}>
          {/* Static thumbnail — hidden while previewing */}
          <img
            src={thumbSrc}
            width={300}
            height={300}
            alt={post.title}
            style={{
              display: 'block',
              width: '100%',
              opacity: showPreview ? 0 : 1,
              transition: 'opacity 0.15s',
              position: showPreview ? 'absolute' : 'static',
              top: 0, left: 0,
            }}
          />
          {/* Live preview canvas — shown on hover once data is loaded */}
          {previewData && (
            <MapPreviewCanvas
              data={previewData}
              style={{
                opacity: showPreview ? 1 : 0,
                transition: 'opacity 0.15s',
                position: showPreview ? 'static' : 'absolute',
                top: 0, left: 0,
                pointerEvents: 'none',
              }}
            />
          )}
        </a>

        <div className="browse-info">
          <div className="title-container">
            <div className="post-header-container">
              <div className="userCard">
                <a>
                  <b className="userName">{post.title || 'Untitled'}</b>
                  <div className="timestamp">{displayTime}</div>
                </a>
              </div>
            </div>
            {post.description && (
              <div className="title" style={{ fontSize: '0.85em', color: '#888' }}>
                {post.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowsePostLink;
