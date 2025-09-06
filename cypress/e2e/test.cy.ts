describe('BioMasters TCG E2E Tests', () => {
  it('Loads the app and shows all main elements', () => {
    cy.visit('/')

    // Check that the app loads and shows the main title
    cy.contains('ion-title', '🧬 Biomasters TCG')

    // Check that the main content loads
    cy.contains('ion-content', 'Welcome!')

    // Check that all navigation tabs are present and visible
    cy.get('ion-tab-button').should('have.length', 4)
    cy.contains('ion-tab-button', 'Home').should('be.visible')
    cy.contains('ion-tab-button', 'Collection').should('be.visible')
    cy.contains('ion-tab-button', 'Deck Builder').should('be.visible')
    cy.contains('ion-tab-button', 'Settings').should('be.visible')
  })
})