import axios from 'axios';
import Vue from 'vue';
import { mapState } from 'vuex';

import ReaderFactory from 'paraview-glance/src/io/ReaderFactory';

import IntTypes from 'itk/IntTypes'
import FloatTypes from 'itk/FloatTypes'
import PixelTypes from 'itk/PixelTypes'
import Image from 'itk/Image'
import ImageType from 'itk/ImageType'
import createWebworkerPromise from 'itk/createWebworkerPromise'
import config from 'itk/itkConfig'

var querystring = require('querystring');

var datatypeTranslation = {
  "Int8Array": IntTypes.Int8,
  "Uint8Array": IntTypes.UInt8,
  "Int16Array": IntTypes.Int16,
  "Uint16Array": IntTypes.UInt16,
  "Int32Array": IntTypes.Int16,
  "Uint32Array": IntTypes.UInt16,
  "Int64Array": IntTypes.Int16,
  "Uint64Array": IntTypes.UInt16,
  "Float32Array": FloatTypes.Float32,
  "Float64Array": FloatTypes.Float64,
}

function wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}

function fetchCurrentData(index) {
  this.interfaceComponents[index].currentData = this.proxyManager.getSources();
}

function parseResponse(responses) {
  for (var i = 0; i < responses.length; i++) {
    if (responses[i].type == "PlainText") {
      alert(responses[i].content, responses[i].label);
    }
    if (responses[i].type == "LabelVolume") {

      var arraybuf = base64ToBuffer(responses[i].content)
      var blob = new Blob( [arraybuf], { type: 'text/plain' } )
      var file = new File([blob], "labels" + this.num_total_inferences + ".mha");

      this.Glance.loadFiles([file])
      .then((readers) => {
        this.Glance.registerReadersToProxyManager(readers, this.proxyManager);
      });

    }
    if (responses[i].type == "VTKMesh") {
      var arraybuf = base64ToBuffer(responses[i].content)
      var blob = new Blob( [arraybuf], { type: 'text/plain' } )
      var file = new File([blob], "labels" + this.num_total_inferences + ".vtk");

      this.Glance.loadFiles([file])
      .then((readers) => {
        this.Glance.registerReadersToProxyManager(readers, this.proxyManager);
      });
    }
    if (responses[i].type == "DelayedResponse") {
        var reqId = responses[i].request_id
        var message = {'request_id': reqId}
        var config = {
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
          };
        var address = this.currServer.predictionURL.split("/", 3)[2]
        axios.post('http://' + address + "/responses", querystring.stringify(message), config)
        .then((response) => {
            wait(5000)
            this.parseResponse(response.data)
        })
        .catch((error) => {
          console.log(error);
          this.status = 'idle'
          this.status = 'genericError';
        });
    }
    if (responses[i].type == "Fiducials") {
      this.status = 'idle'
      this.status = 'errorFiducialResponse';
    }
  }
  this.status = 'idle'
}

function selectData(index, data) {
  var curr_element = this.interfaceComponents[index];
  if (curr_element.type == 'volume') {
    var dataset = this.interfaceComponents[index].currentData[data].getDataset();
    this.interfaceComponents[index].currentSelection = dataset
  }
}

function writeImageArrayBuffer(webWorker, useCompression, image, fileName, mimeType) {
  let worker = webWorker
  return createWebworkerPromise('ImageIO', worker)
    .then(({ webworkerPromise, worker: usedWorker }) => {
      worker = usedWorker
      return webworkerPromise.postMessage(
        {
          operation: 'writeImage',
          name: fileName,
          type: mimeType,
          image: image,
          useCompression: useCompression,
          config: config
        },
        [image.data.buffer.slice(0)]
      ).then(function (buffer, worker) {
        return Promise.resolve({ buffer, webWorker: worker })
      })
    })
}

function convertVtkToItkImage(vtkImage) {
  var scalars = vtkImage.getPointData().getScalars()
  var datatype = scalars.getDataType()
  var direction = vtkImage.getDirection()

  let type = new ImageType(3, datatypeTranslation[datatype], 1, scalars.getNumberOfComponents())

  let image = new Image(type)

  // transposition
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      image.direction.data[i + j * 3] = direction[j + i * 3]
    }
  }

  image.origin = vtkImage.getOrigin()
  image.spacing = vtkImage.getSpacing()
  image.data = scalars.getData() //.buffer
  image.size = vtkImage.getDimensions()

  return image
}

function retrieveImageData(image) {
  return
}

var assembleMessage = function(interfaceComponents) {
  var currMessage = []
  for (var i = 0; i < interfaceComponents.length; i++) {
    if (interfaceComponents[i].type == 'volume') {
      var image = this.convertVtkToItkImage(interfaceComponents[i].currentSelection)
      var promise = writeImageArrayBuffer(null, true, image, 'hello.mha')
      currMessage.push(promise)
    }
    if (interfaceComponents[i].type == 'slider') {
      currMessage.push(interfaceComponents[i].currentSelection.toString());
    }
    if (interfaceComponents[i].type == 'checkbox') {
      currMessage.push(interfaceComponents[i].currentSelection)
    }
    if (interfaceComponents[i].type == 'radiobutton') {
      currMessage.push(interfaceComponents[i].params.options[interfaceComponents[i].currentSelection])
    }
  }

  return Promise.all(currMessage)
}

'use strict';

function bufferToBase64(data) {
    var buf = new Uint8Array(data)
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}

function base64ToBuffer(base64) {
    var binary_string =  window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function sendRequest(currMessage) {
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  axios.post(this.currServer.predictionURL, querystring.stringify(currMessage), config)
  .then((response) => {
    this.parseResponse(response.data)
  })
  .catch((error) => {
    console.log(error);
    this.status = 'idle'
    this.status = 'genericError';
  });
}

function process() {
  this.assembleMessage(this.interfaceComponents)
  .then((messages) => {
    var finalMessage = {}
    for (var i = 0; i < messages.length; i++) {
      if (this.interfaceComponents[i].type == 'volume') {
        var string = bufferToBase64(messages[i].buffer)
        finalMessage[this.interfaceComponents[i].destination] = string
      }
      if (this.interfaceComponents[i].type == 'slider') {
        finalMessage[this.interfaceComponents[i].destination] = messages[i]
      }
      if (this.interfaceComponents[i].type == 'checkbox') {
        finalMessage[this.interfaceComponents[i].destination] = messages[i]
      }
      if (this.interfaceComponents[i].type == 'radiobutton') {
        finalMessage[this.interfaceComponents[i].destination] = messages[i]
      }
    }
    this.sendRequest(finalMessage)
    this.num_total_inferences = this.num_total_inferences + 1
  });
  this.status = 'predicting';
}


export default {
  name: 'Tomaat',
  data() {
    return {
      directConnectionURL: 'http://127.0.0.1:9001',
      publicServerListURL: 'http://tomaat.cloud:8001/discover',
      publicServerList: [],
      serverInterface: [],
      interfaceComponents: [],
      Glance: window.Glance,
      status: 'idle',
      num_total_inferences: 0,
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
    isPredicting: function () {
      if (this.status == 'predicting') {
        return true
      }
      return false
    },
    isErrorDelayedResponse: function () {
      if (this.status == 'errorDelayedResponse') {
        return true
      }
      return false
    },
    isErrorFiducialResponse: function () {
      if (this.status == 'errorFiducialResponse') {
        return true
      }
      return false
    },
    isGenericError: function() {
    if (this.status == 'genericError') {
      return true
    }
      return false
    },
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
      this.renderCarousel()

      //ReaderFactory.loadFiles([Blob])
    },
    carouselBackward: function() {
      if (this.currServerIdx > 0){
        this.currServerIdx = this.currServerIdx - 1
      }
      this.renderCarousel()
    },
    chooseServer: function() {
      axios.get(this.currServer.interfaceURL)
      .then((response) => {
        this.serverInterface = response.data
        this.interfaceComponents = []
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
              currentSelection: (this.serverInterface[i].maximum - this.serverInterface[i].minimum) / 2,
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
      })
        .catch(error => {
        console.log(error.response)
      });
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
    resetStatus: function () {
      this.status = 'idle'
    },
    fetchCurrentData,
    selectData,
    sendRequest,
    assembleMessage,
    process,
    convertVtkToItkImage,
    retrieveImageData,
    parseResponse,
  },
};
