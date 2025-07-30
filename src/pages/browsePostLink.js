/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from "react";
// Authentication disabled in local mode
import * as timeago from "timeago.js";
import useSound from "use-sound";
import StarButton from "./star/StarButton";

import "react-dropdown/style.css";
import {
  useQueryParams,
  StringParam,
  BooleanParam,
  withDefault,
  NumberParam,
} from "next-query-params";
import { useRouter } from "next/router";
import classNames from "classnames";

// import { useSession, signIn, signOut } from "next-auth/react";
import axios from "axios";
import { imageURLBase } from "../simulation-controls/ExtraUI";
import useStore, { globalState } from "../store";
import { loadPostFromServer } from "../loadPostFromServer.js";
import { Replies } from "./replies.js";
import Parent from "./parent.js";
import { copyTextToClipboard } from "../utils/clipboard.js";

export const BrowsePostLink = ({ post: initPost, isReply, isParent }) => {
  const router = useRouter();
  const session = null; // No authentication in local mode
  const [post, setPost] = useState(initPost);
  const [repliesVisible, setRepliesVisible] = useState(false);
  const [parentVisible, setParentVisible] = useState(false);
  const expandedPostId = useStore((state) => state.expandedPostId);
  const expanded = expandedPostId === post.id;
  const mobile = typeof window !== 'undefined' ? window.innerWidth <= 700 : false;

  let stars = post?._count?.stars;
  const [starsOverride, setStarsOverride] = useState(null);

  if (starsOverride !== null) {
    stars = starsOverride;
  }

  let isStarred = session?.userId && post?.stars?.length > 0;
  const [isStarredOverride, setIsStarredOverride] = useState(null);

  if (isStarredOverride !== null) {
    isStarred = isStarredOverride;
  }

  const href = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/post/${post.id}` : '';
  const [play] = useSound("/media/delete.wav", {
    volume: 0.15,
  });
  const [play2] = useSound("/media/block.wav", {
    volume: 0.15,
  });

  const handleClick = (e) => {
    if (expanded) return;
    play();
    useStore.setState({ post });
    loadPostFromServer(post.id);
    window.history.replaceState(
      {},
      document.title,
      `/post/${post.id}${query.admin ? "" : "?admin=0"}`
    );
    if (mobile) window.scrollTo(0, 0);
    e.preventDefault();
  };

  const handleEdit = (e) => {
    router.push(href);
    e.preventDefault();
  };
  const [query, setQuery] = useQueryParams({
    codeHash: StringParam,
    userId: StringParam,
    featured: BooleanParam,
    admin: withDefault(BooleanParam, true),
    id: NumberParam,
  });

  let metadata = post.metadata;

  let displayTime = new Date(post.createdAt).toLocaleDateString();
  let msAgo = new Date().getTime() - new Date(post.createdAt).getTime();

  if (msAgo < 7 * 24 * 60 * 60 * 1000) {
    displayTime = timeago.format(post.createdAt);
  }

  let [adminFeaturingStatus, setAdminFeaturingStatus] = useState(null);
  let [adminPublishingStatus, setAdminPublishingStatus] = useState(null);
  let [adminDeletingStatus, setAdminDeletingStatus] = useState(null);

  const [isHovering, setIsHovering] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUserClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/user/${post.user.id}`, undefined, {
      scroll: false,
    });
  };

  return (
    <div className="post-family">
      {parentVisible && post.parent && <Parent post={post} />}
      <div
        className={classNames("post", {
          selected: expanded,
          placeholder: post.placeholder,
        })}
        onClick={handleClick}
      >
        <a className="postThumbnail" style={{ fontSize: "1rem" }}>
          <img
            src={`${imageURLBase}${post.id}.gif`}
            width={300}
            height={300}
            style={{
              display: isHovering ? "block" : "none",
            }}
            onError={(e) => {
              if (e.target.src.endsWith("gif")) {
                e.target.src = `${imageURLBase}${post.id}.png`;
              }
            }}
            onMouseEnter={(e) => {
              setIsHovering(true);
            }}
            onMouseOut={(e) => {
              setIsHovering(false);
            }}
          ></img>
          <img
            src={`${imageURLBase}${post.id}.png`}
            width={300}
            height={300}
            style={{
              display: isHovering ? "none" : "block",
            }}
            onError={(e) => {
              if (e.target.src.endsWith("gif")) {
                e.target.src = `${imageURLBase}${post.id}.png`;
              }
            }}
            onMouseEnter={(e) => {
              setIsHovering(true);
            }}
            onMouseOut={(e) => {
              setIsHovering(false);
            }}
          ></img>
        </a>

        <div className="browse-info">
          {/*<button
          className="element-set-button"
          onClick={(e) => {
            e.preventDefault();
            setQuery({ codeHash: post.codeHash, userId: undefined });
          }}
        >
          <ElementButtons
            elements={metadata.elements}
            disabled={metadata.disabled}
            colors={metadata.colors}
            color2s={metadata.color2s}
            inert={true}
            selectedElement={-1}
          ></ElementButtons>
        </button>*/}

          <div className="title-container">
            <div className="post-header-container">
              <div className="userCard">
                {!post.placeholder && (
                  <img
                    onClick={handleUserClick}
                    className="pfp"
                    src={post?.user?.image}
                  ></img>
                )}
                <a>
                  <b className="userName" onClick={handleUserClick}>
                    {post?.user?.name ?? post?.user?.id?.slice(0, 8)}
                  </b>
                  {!post.placeholder && (
                    <div className="timestamp">{displayTime}</div>
                  )}
                </a>
              </div>
              {!isReply &&
                !parentVisible &&
                post.parent &&
                ((session?.role === "admin" && query.admin) ||
                  post.parent.deletedAt === null) && (
                  <button
                    className="replies-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setParentVisible(!parentVisible);
                    }}
                  >
                    {(() => {
                      if (mobile) {
                        return parentVisible ? "▼" : "▲";
                      } else {
                        return `reply to ${parentVisible ? "▼" : "▲"}`;
                      }
                    })()}
                  </button>
                )}
            </div>
            <div className="title">
              {post.title === "" ? "" : `"${post.title}"`}
            </div>
          </div>

          {expanded && session?.role === "admin" && query.admin && (
            <div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();

                  setAdminFeaturingStatus(" ...");
                  const result = await axios("/api/update/" + post.id, {
                    params: { featured: !post.featuredAt },
                  });
                  let results = result.data;
                  results.metadata = JSON.parse(results.metadata);
                  setPost(results);
                  setAdminFeaturingStatus("");
                }}
              >
                {post.featuredAt ? "Unfeature" : "Feature"}
                {adminFeaturingStatus}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  play;
                  setAdminPublishingStatus(" ...");
                  const result = await axios("/api/update/" + post.id, {
                    params: { public: !post.public },
                  });
                  let results = result.data;
                  results.metadata = JSON.parse(results.metadata);
                  setPost(results);
                  setAdminPublishingStatus("");
                }}
              >
                {post.public === true ? "Make Private" : "Make Public"}
                {adminPublishingStatus}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  play;
                  setAdminDeletingStatus(" ...");
                  const result = await axios("/api/update/" + post.id, {
                    params: { deleted: !post.deletedAt },
                  });
                  let results = result.data;
                  results.metadata = JSON.parse(results.metadata);
                  setPost(results);
                  setAdminDeletingStatus("");
                }}
              >
                {post.deletedAt ? "Undelete" : "Delete"}
                {adminDeletingStatus}
              </button>
            </div>
          )}

          <div style={{ textAlign: "justify" }}>
            {expanded && session && post?.user?.id == session.userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();

                  fetch("/api/updateProfile/", {
                    method: "post",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      postId: post.id,
                    }),
                  })
                    .then(function (response) {
                      return response.json();
                    })
                    .then(function (post) {
                      window.location.reload();
                    });
                }}
              >
                Set this post as my avatar
              </button>
            )}
            {post.featuredAt && (
              <>
                <br></br>
                <span className="featured-flag">🏆FEATURED</span>
              </>
            )}
            {post.deletedAt && (
              <>
                <br></br>
                <span className="featured-flag">❌DELETED</span>
              </>
            )}
            {
              <div className="browse-post-metadata-row">
                <span>
                  <StarButton
                    starred={isStarred}
                    onClick={(e) => {
                      if (!session || !session.userId) return;
                      e.stopPropagation();
                      play2();
                      setStarsOverride(stars + 1 * (isStarred ? -1 : 1));
                      setIsStarredOverride(!isStarred);
                      fetch("/api/star/" + post.id)
                        .then(function (response) {
                          return response.json();
                        })
                        .then(function (new_post) {
                          new_post.metadata = JSON.parse(new_post.metadata);
                          setPost(new_post);

                          setIsStarredOverride(null);
                          setStarsOverride(null);
                        });
                    }}
                  />

                  <span
                    style={{
                      zoom: 1.25,
                      border: "none",
                      background: "none",
                      marginBottom: 0,
                      fontSize: 23,
                      marginRight: 8,
                    }}
                  >
                    {post.placeholder ? "" : stars}
                  </span>
                  {/*expanded && (
                    <button
                      onClick={() => {
                        if (!copied) {
                          copyTextToClipboard(href);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1000);
                        }
                      }}
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  )*/}
                  {!post.placeholder && <div>{post.views} plays</div>}
                </span>
                {/*<div className="featured-flag">
                {post.featuredAt ? "🏆FEATURED" : ""}
              </div>*/}
                {!isParent &&
                  !repliesVisible &&
                  post.children &&
                  post.children.length > 0 && (
                    <button
                      className="replies-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRepliesVisible(!repliesVisible);
                      }}
                    >
                      {(() => {
                        if (mobile) {
                          return repliesVisible ? "▲" : "▼";
                        } else {
                          return `${post.children.length} ${
                            post.children.length > 1 ? "replies" : "reply"
                          } ${repliesVisible ? "▲" : "▼"}`;
                        }
                      })()}
                    </button>
                  )}
              </div>
            }
          </div>
        </div>
      </div>
      {repliesVisible && post.children && <Replies post={post} />}
    </div>
  );
};

export default BrowsePostLink;
