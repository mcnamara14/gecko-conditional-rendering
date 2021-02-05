import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import {
  DisplayText,
  Paragraph,
  SectionHeading,
  TextInput,
  Textarea,
  FieldGroup,
  RadioButtonField,
  Form,
  SelectField,
  Option,
} from '@contentful/forma-36-react-components';
import { init, locations } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-fcss/dist/styles.css';
import './index.css';

/**
 * To use this demo create a Content Type with the following fields:
 *  title: Short text
 *  body: Long text
 *  hasAbstract: Boolean
 *  abstract: Long text
 *
 *  See https://github.com/contentful/create-contentful-extension/blob/master/docs/examples/entry-editor-content-model.json for details.
 */

const App = ({ sdk }) => {
  const [templateName, setTemplateName] = useState(sdk.entry.fields.templateName.getValue());
  let [entries, setEntries] = useState(0);

  // const onTitleChangeHandler = (event) => {
  //   const value = event.target.value;
  //   this.setState({ title: value });
  //   sdk.entry.fields.title.setValue(value);
  // };

  // const onBodyChangeHandler = (event) => {
  //   const value = event.target.value;
  //   this.setState({ body: value });
  //   sdk.entry.fields.body.setValue(value);
  // };

  // const onAbstractChangeHandler = (event) => {
  //   const value = event.target.value;
  //   this.setState({ abstract: value });
  //   sdk.entry.fields.abstract.setValue(value);
  // };

  // const onHasAbstractChangeHandler = (event) => {
  //   const hasAbstract = event.target.value === 'yes';
  //   this.setState({ hasAbstract });
  //   sdk.entry.fields.hasAbstract.setValue(hasAbstract);
  // };

  const openNewEntry = async () => {
    const result = await sdk.navigator.openNewEntry('richText', {
      slideIn: { waitForClose: true },
    });
  };

  const handleOnTemplateNameChange = async (e) => {
    const template = await sdk.space.getEntry('3mtTRlbNuJxDtBMH4i2hmd');
    const rowFields = await sdk.space.getEntry(template.fields.rows['en-US'][0].sys.id);

    const columnFields = await Promise.all(
      rowFields.fields.columns['en-US'].map((column) => {
        return sdk.space.getEntry(column.sys.id);
      })
    );

    const itemFields = await Promise.all(
      columnFields.map((field) => {
        return Promise.all(
          field.fields.items['en-US'].map((item) => {
            return sdk.space.getEntry(item.sys.id);
          })
        );
      })
    );

    itemFields.forEach((field) => {
      field.forEach((item) => {
        if (item.sys.contentType.sys.id === 'richText') setEntries((entries += 1));
      });
    });

    console.log('entries', entries);
  };

  const getFields = () => {
    let fields = [];
    for (let i = 0; i < 3; i++) {
      fields.push(<button onClick={openNewEntry}>Open new entry</button>);
    }

    return fields;
  };

  return (
    <Form className="f36-margin--l">
      <DisplayText>Entry extension demo</DisplayText>
      <Paragraph>
        This demo uses a single UI s Extension to render the whole editor for an entry.
      </Paragraph>
      <SelectField
        name="optionSelect"
        id="optionSelect"
        labelText="Label"
        selectProps="large"
        onChange={(e) => handleOnTemplateNameChange(e)}>
        <Option value="Ladder">Ladder</Option>
        <Option value="Sledge">Sledge</Option>
      </SelectField>
      {getFields()}
      {/* <SectionHeading>Title</SectionHeading>
        <TextInput
          testId="field-title"
          onChange={this.onTitleChangeHandler}
          value={this.state.title}
        />
        <SectionHeading>Body</SectionHeading>
        <Textarea testId="field-body" onChange={this.onBodyChangeHandler} value={this.state.body} />
        <SectionHeading>Has abstract?</SectionHeading>
        <FieldGroup row={false}>
          <RadioButtonField
            labelText="Yes"
            checked={this.state.hasAbstract === true}
            value="yes"
            onChange={this.onHasAbstractChangeHandler}
            name="abstractOption"
            id="yesCheckbox"
          />
          <RadioButtonField
            labelText="No"
            checked={this.state.hasAbstract === false}
            value="no"
            onChange={this.onHasAbstractChangeHandler}
            name="abstractOption"
            id="noCheckbox"
          />
          <button onClick={this.openNewEntry}>Open new entry</button>
        </FieldGroup> */}
      {/* {this.state.hasAbstract && (
          <React.Fragment>
            <SectionHeading>Abstract</SectionHeading>
            <Textarea
              testId="field-abstract"
              onChange={this.onAbstractChangeHandler}
              value={this.state.abstract}
            />
          </React.Fragment>
        )} */}
    </Form>
  );
};

init((sdk) => {
  console.log('sdk', sdk);
  if (sdk.location.is(locations.LOCATION_ENTRY_EDITOR)) {
    render(<App sdk={sdk} />, document.getElementById('root'));
  }
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
