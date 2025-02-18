import React, { useState } from 'react';

import mark from './mark.svg';

import type { Props } from '../../types';

import styles from './style.module.scss';

const Icon = (props: { src: null | string }) => {
  const { src } = props;
  const [innerSrc, setInnerSrc] = useState(src ?? mark);

  return (
    <img
      alt="icon"
      className="icon"
      src={innerSrc}
      onError={() => {
        setInnerSrc(mark);
      }}
    ></img>
  );
};

const ShowCard = (props: { data: Props['data'] }) => {
  const { data } = props;

  return (
    <ul>
      {data.map((bookmark) => (
        <li
          key={bookmark.id}
          className={styles.link}
          onClick={() => {
            window.open(bookmark.url);
          }}
        >
          <Icon src={bookmark.icon} />
          <div className="title">{bookmark.title}</div>
        </li>
      ))}
    </ul>
  );
};

export default ShowCard;
