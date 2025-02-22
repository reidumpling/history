import React, { useState } from 'react'
import styled, { css } from 'styled-components'

import Img from '../Img'

const Bullet = styled.li`
  width: 195px;
  height: 110px;
  background-color: #545454;
  padding-bottom: 6px;
  float: left;
  margin: 6px;
`

const Caption = styled.span`
  font-weight: bold;
  font-size: 11px;
  margin: 0 5px;
`

const ImgButton = styled.a`
  display: block;
  border-style: solid;
  border-width: 5px 5px 20px;
  border-color: #545454;
  :hover {
    border-color: orange;
  }

  ${({ viewed }) => viewed && css`
      border-color: white;
  `}
`

function ThumbImg({
  onClick,
  caption,
  href,
  src,
  id,
  viewed: previewed = false,
}) {
  const [viewed, setViewed] = useState(previewed)
  const handleClick = (event) => {
    event.preventDefault()
    setViewed(true)
    onClick?.()
  }
  if (previewed && !viewed) {
    setViewed(true)
  }

  return (
    <Bullet>
      <ImgButton viewed={viewed} href={href} onClick={handleClick} id={id}>
        <Img src={src} alt="Preview thumbnail (scaled down dimensions)" />
      </ImgButton>
      <Caption>{caption}</Caption>
    </Bullet>
  )
}

export default ThumbImg
