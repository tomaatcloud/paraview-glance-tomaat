import Images from 'paraview-glance/src/samples/images';

const version =
  window.GLANCE_VERSION && window.GLANCE_VERSION !== 'master'
    ? `v${window.GLANCE_VERSION}`
    : 'master';

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
