import { useEffect, useState } from 'react'
import styled from 'styled-components'
import fetchXml from '../../../src/lib/nearby'

const Wrapper = styled.div`
  color : red;
  background-color: white;
  width:60em;
`

const Image = styled.div`
&:hover {
  cursor: pointer;
  color: yellow;
}
`

export const getServerSideProps = async (context) => {
  const { lon, lat } = context.query
  return {
    props: { lon, lat },
  }
}

export default function Nearby({ lon, lat }) {
  const [images, setImages] = useState([])

  useEffect(() => {
    fetchXml(lon, lat)
      .then((response) => {
        const result = JSON.parse(JSON.stringify(response.data, null, 2))
        const imagesUrl = result.rsp.photos ? result.rsp.photos.photo.map(
          (imageData) => imageData.$.url_t,
        )
          : []
        setImages(imagesUrl)
      })
    // .catch(e => console.log(e))
  }, [])

  return (
    <Wrapper>
      <title>HW_0125</title>
      <h1>Hello world</h1>
      <Image>{images.map((imageSrc) => <img key={imageSrc} src={imageSrc} alt="nearby" />)}</Image>
    </Wrapper>
  )
}
// create function and put css
