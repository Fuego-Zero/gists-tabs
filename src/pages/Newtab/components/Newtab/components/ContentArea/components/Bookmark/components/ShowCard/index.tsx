import React from 'react';

import mark from './mark.svg';

import type { Props } from '../../types';

import styles from './style.module.scss';

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
          <img alt="icon" className="icon" src={bookmark.icon || mark}></img>
          <div className="title">{bookmark.title}</div>
        </li>
      ))}
    </ul>
  );
};

export default ShowCard;
