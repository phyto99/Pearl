import React, { useState } from "react";
import * as timeago from "timeago.js";
import useSound from "use-sound";
import classNames from "classnames";
import { useRouter } from "next/router";
import useStore from "../store";
import { loadPostFromServer } from "../loadPostFromServer.js";

export const BrowsePostLink = ({ post: initPost, isReply, isParent }) => {
  const router = useRouter();
  const [post] = useState(initPost);
  const expandedPostId = useStore((state) => state.expandedPostId);
  const expanded = expandedPostId === post.id;
  const mobile = typeof window !== 'undefined' ? window.innerWidth <= 700 : false;

  const [play] = useSound("/media/delete.wav", { volume: 0.15 });

  let displayTime = new Date(post.createdAt).toLocaleDateString();
  const msAgo = new Date().getTime() - new Date(post.createdAt).getTime();
  if (msAgo < 7 * 24 * 60 * 60 * 1000) displayTime = timeago.format(post.createdAt);

  // Local maps have a .thumbnail field; remote posts used imageURLBase
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

  return (
    <div className="post-family">
      <div
        className={classNames("post", {
          selected: expanded,
          placeholder: post.placeholder,
        })}
        onClick={handleClick}
      >
        <a className="postThumbnail">
          <img
            src={thumbSrc}
            width={300}
            height={300}
            alt={post.title}
          />
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
