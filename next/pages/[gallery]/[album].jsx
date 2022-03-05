import Head from 'next/head'
import Link from 'next/link'
import styled from 'styled-components'
import { useRef, useState } from 'react'

import { get as getAlbum } from '../../src/lib/album'
import { get as getAlbums } from '../../src/lib/albums'
import { get as getGalleries } from '../../src/lib/galleries'

import SplitViewer from '../../src/components/SplitViewer'
import ThumbImg from '../../src/components/ThumbImg'
import useSearch from '../../src/hooks/useSearch'
import useMemory from '../../src/hooks/useMemory'

async function buildStaticPaths() {
  const { galleries } = await getGalleries()
  const groups = await Promise.all(galleries.map(async (gallery) => {
    const { albums } = await getAlbums(gallery)
    return albums.map(({ name: album }) => ({ params: { gallery, album } }))
  }))
  return groups.flat()
}

export async function getStaticProps({ params: { gallery, album } }) {
  const { album: albumDoc } = await getAlbum(gallery, album)
  const preparedItems = albumDoc.items.map((item) => ({
    ...item,
    corpus: [item.description, item.caption, item.location, item.city, item.search].join(' '),
  }))
  return {
    props: { items: preparedItems },
  }
}

export async function getStaticPaths() {
  return {
    paths: await buildStaticPaths(),
    fallback: false,
  }
}

const Wrapper = styled.ul`
  list-style: none;
  padding-left: 2px;
`

const StyledLink = styled.a`
  color: green;
  text-decoration: none;
  &:hover {
    cursor: pointer;
    color: yellow;
  }
`

function AlbumPage({ items = [] }) {
  const [memoryIndex, setMemoryIndex] = useState(0)
  const refImageGallery = useRef(null)
  const {
    filtered,
    searchBox,
  } = useSearch(items)
  const { setViewed, memoryHtml, viewedList } = useMemory(filtered)

  function selectThumb(index) {
    refImageGallery.current.slideToIndex(index)
  }

  return (
    <div>
      <Head>
        <title>History App - Album</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {searchBox}
      <SplitViewer
        setViewed={setViewed}
        items={filtered}
        refImageGallery={refImageGallery}
        memoryIndex={memoryIndex}
        setMemoryIndex={setMemoryIndex}
      />
      <Link href={{ pathname: '/demo/sample/nearby', query: { lon: items[memoryIndex].coordinates[0], lat: items[memoryIndex].coordinates[1] } }}>
        <StyledLink>{memoryHtml}</StyledLink>
      </Link>
      <Wrapper>
        {filtered.map((item, index) => (
          <ThumbImg
            onClick={() => selectThumb(index)}
            src={item.thumbPath}
            caption={item.caption}
            key={item.filename}
            id={`select${item.id}`}
            viewed={(viewedList.includes(index))}
          />
        ))}
      </Wrapper>
    </div>
  )
}

export default AlbumPage
