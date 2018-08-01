import Images from 'paraview-glance/src/samples/images';

// prettier-ignore
export default [
  {
    label: '3DUS.mha',
    image: Images.Ultrasound,
    size: '2.9 MB',
    datasets: [
      {
        name: '3DUltrasound.glance',
        url: 'https://tomaatcloud.github.io/3DUS.glance',
      },
    ],
  },

];
