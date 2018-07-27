import axios from 'axios';
import Vue from 'vue';
import { mapState } from 'vuex';

import ReaderFactory from 'paraview-glance/src/io/ReaderFactory';


function fetchCurrentData(index) {
  // this function fetches data list from the scene. good only for volume type
  this.interfaceComponents[index].currentData = this.proxyManager.getSources();
}

function selectData(index, data) {
  // this function is good for any interface block type
  var curr_element = this.interfaceComponents[index];
  if (curr_element.type == 'volume') {
    this.interfaceComponents[index].currentSelection = this.interfaceComponents[index].currentData[data].getDataset()
    console.log(this.interfaceComponents[index].currentSelection)
    console.log(this.interfaceComponents[index].currentSelection.file)
  }
  if (curr_element.type == 'slider') {
      console.log('slider')
    }
  if (curr_element.type == 'checkbox') {
     console.log('checkbox')
  }
  if (curr_element.type == 'radiobutton') {
     console.log('radiobutton')
  }

}

//function processDataIntoRequest() {
//  message = []
//  for (var i = 0; i < this.interfaceComponents.length; i++) {
//
//    if (this.interfaceComponents[i].type == 'volume') {
//      var dataBuffer = null
//      message.push({this.interfaceComponents[i].destination: dataBuffer})
//    }
//    if (this.interfaceComponents[i].type == 'slider') {
//      message.push({this.interfaceComponents[i].destination: curr_element.currentSelection})
//    }
//    if (this.interfaceComponents[i].type == 'checkbox') {
//      message.push({this.interfaceComponents[i].destination: curr_element.currentSelection})
//    }
//    if (this.interfaceComponents[i].type == 'radiobutton') {
//      message.push({this.interfaceComponents[i].destination: curr_element.params.options[curr_element.currentSelection]})
//    }
//  }
//}


export default {
  name: 'Tomaat',
  data() {
    return {
      directConnectionURL: 'http://127.0.0.1:9001',
      publicServerListURL: 'http://tomaat.cloud:8001/discover',

      publicServerList: [],
      serverInterface: [],
      interfaceComponents: [],

      currServerIdx: -1,
      currServer: {
        name: null,
        task: null,
        modality: null,
        anatomy: null,
        predictionURL: null,
        interfaceURL: null,
      },
    };
  },
  computed: mapState({
    proxyManager: 'proxyManager',
  }),
  methods: {
    connectDirectly: function() {
      this.currServer = {
        name: null,
        task: null,
        anatomy: null,
        modality: null,
        predictionURL: this.directConnectionURL + "/predict",
        interfaceURL: this.directConnectionURL + "/interface",
      }
      this.chooseServer()
    },
    loadPublicServerList: function () {
      axios.get(this.publicServerListURL)
      .then((response) => {
        this.publicServerList = response.data
        this.currServerIdx = 0
        this.renderCarousel()
      })
      .catch(error => {
        this.publicServerList = []
        this.currServerIdx = -1
        console.log(error.response)
      });
    },
    carouselForward: function() {
      if (this.currServerIdx < this.publicServerList.length - 1){
        this.currServerIdx = this.currServerIdx + 1
      }
      console.log(this.currServerIdx)
      this.renderCarousel()

      //ReaderFactory.loadFiles([Blob])
    },
    carouselBackward: function() {
      if (this.currServerIdx > 0){
        this.currServerIdx = this.currServerIdx - 1
      }
      console.log(this.currServerIdx)
      this.renderCarousel()
    },
    chooseServer: function() {
      this.interfaceComponents = []

      axios.get(this.currServer.interfaceURL)
      .then((response) => {
        this.serverInterface = response.data
      })
      .catch(error => {
        console.log(error.response)
      });
      console.log(this.serverInterface)
      for (var i = 0; i < this.serverInterface.length; i++) {
        if (this.serverInterface[i].type == 'volume') {
          this.interfaceComponents.push({
            type: 'volume',
            text: this.serverInterface[i].destination,
            params: null,
            destination: this.serverInterface[i].destination,
            currentSelection: null,
            currentData: null
          })
        }

        if (this.serverInterface[i].type == 'checkbox') {
          this.interfaceComponents.push({
            type: 'checkbox',
            text: this.serverInterface[i].text,
            params: null,
            destination: this.serverInterface[i].destination,
            currentSelection: false,
            currentData: null
            })
        }

        if (this.serverInterface[i].type == 'slider') {
          this.interfaceComponents.push({
            type: 'slider',
            text: this.serverInterface[i].destination,
            destination: this.serverInterface[i].destination,
            params: {
              min: this.serverInterface[i].minimum,
              max: this.serverInterface[i].maximum,
              step: (this.serverInterface[i].maximum - this.serverInterface[i].minimum) / 100,
            },
            currentSelection: (this.serverInterface[i].max - this.serverInterface[i].min) / 2,
            currentData: null
          })
        }

        if (this.serverInterface[i].type == 'radiobutton') {
          this.interfaceComponents.push({
            type: 'radiobutton',
            text: this.serverInterface[i].text,
            destination: this.serverInterface[i].destination,
            params: {
              options: this.serverInterface[i].options,
            },
            currentSelection: 0,
            currentData: null
          })
        }

        if (this.serverInterface[i].type == 'fiducials') {
        }
      }
      this.interfaceComponents.push({
        type: 'terminator',
        text: null,
        destination: null,
        params: null,
        currentSelection: null,
        currentData: null
      })
    },
    renderCarousel: function () {
      this.currServer = {
        name: this.publicServerList[this.currServerIdx].name,
        task: this.publicServerList[this.currServerIdx].task,
        anatomy: this.publicServerList[this.currServerIdx].anatomy,
        modality: this.publicServerList[this.currServerIdx].modality,
        predictionURL: this.publicServerList[this.currServerIdx].prediction_url,
        interfaceURL: this.publicServerList[this.currServerIdx].interface_url,
      }
    },
    fetchCurrentData,
    selectData,
  },
};
