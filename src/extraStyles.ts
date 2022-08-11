import { css } from 'alumina';

const mqUnderMedium = `@media screen and (max-width: 640px)`;
// const mqOverMedium = `@media screen and (min-width: 640px)`;

export const extraStylesDefinition = css`
  .extraStyle__pathExampleBox {
    max-width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 10px;

    > img {
      max-width: calc(100% - 160px);
      flex-shrink: 1;
      object-fit: scale-down;
      align-self: flex-start;
    }

    > pre {
      border: solid 1px #ccc;
      padding: 10px;
      min-width: 160px;
    }

    ${mqUnderMedium} {
      flex-direction: column;
      > img {
        max-width: 100%;
      }
    }
  }
`;
