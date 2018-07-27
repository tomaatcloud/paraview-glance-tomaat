import Datasets from 'paraview-glance/src/components/core/Datasets';
import GlobalSettings from 'paraview-glance/src/components/core/GlobalSettings';
import Applications from 'paraview-glance/src/components/core/Applications';

// ----------------------------------------------------------------------------

export default {
  name: 'ControlsDrawer',
  components: {
    Datasets,
    Applications,
    GlobalSettings,
  },
  data() {
    return {
      activeTab: 0,
    };
  },
};
