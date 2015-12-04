describe('DocEditJs', function() {
  var $compile,
      $rootScope,
      scope;

  beforeEach(module('doceditjs'));
  
  beforeEach(inject(function(_$compile_, _$rootScope_, $templateRequest, $templateCache){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
  }));
  
  it('Replaces the element with content', function() {
    
    scope.document = {
      text: 'text',
      /*date: new Date(),
      number: 7,
      array: ['a', 'b'],
      object: {
        prop: 'a'
      }*/
    };
    
    // Compile a piece of HTML containing the directive
    var element = $compile("<doceditjs-editor dejs-data='document'></doceditjs-editor>")(scope);
    
    // fire all the watches, so the scope expression {{1 + 1}} will be evaluated
    $rootScope.$digest();
    // Check that the compiled element contains the templated content
    expect(element.html()).toContain("<!-- ngInclude: 'dejs/template/node.html' --><div ng-include=\"'dejs/template/node.html'\" class=\"ng-scope\"><table class=\"table table-bordered doceditjs-nodes ng-scope\">                 <tbody><!-- ngRepeat: (k, v) in data track by $index --><tr ng-repeat=\"(k, v) in data track by $index\" class=\"ng-scope\">                    <td class=\"doceditjs-td-label ng-binding\">text</td>                    <td class=\"doceditjs-td-content\">                         <doceditjs-item dejs-content=\"v\" dejs-property=\"k\"><input type=\"text\" class=\"form-control ng-pristine ng-untouched ng-valid ng-scope\" ng-model=\"data[k]\"></doceditjs-item>                     </td>                 </tr><!-- end ngRepeat: (k, v) in data track by $index --><tr>            </tr></tbody></table></div>");
  });
});