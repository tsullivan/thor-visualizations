import React from 'react';
import { ResizableBox } from 'react-resizable';
import generateData from '../lib/generate_data';
import CircleGauge from '../../lib/circle_gauge';
import Color from 'color';
import _ from 'lodash';
import numeral from 'numeral';
export default React.createClass({
  render() {
    const tickFormatter = n => numeral(n).format('0.0b');

    const metric = {
      formatter: n => `${numeral(n).format('0.0b')}/s`,
      label: 'Current Traffic',
      data: generateData(),
      color: 'rgba(4,148,196, 1)'
    };

    const additional = {
      formatter: n => `${numeral(n).format('0.0%')}`,
      label: 'OXYGEN',
      data: [[0,0.2035]],
      color: '#F00'
    };

    return (
      <div>
        <h2>Gauge</h2>
        <ResizableBox
          className="examples__box"
          width={900}
          height={300}
          minConstraints={[200,150]}
          maxConstraints={[900,300]}>
          <CircleGauge innerLine={12} metric={metric}/>
        </ResizableBox>
        <ResizableBox
          className="examples__box"
          width={900}
          height={300}
          minConstraints={[200,150]}
          maxConstraints={[900,300]}
          style={{ backgroundColor: '#000'}}>
          <CircleGauge
            innerColor="#F00"
            valueColor="#F00"
            reversed={true}
            metric={additional}
            max={1}/>
        </ResizableBox>
      </div>
    );
  }
});

