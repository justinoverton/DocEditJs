(function(){
    
    /**
     * DocEditJS
     *
     * @param discriminator - the property or function that determines an object's type
     * @constructor
     * @ngInject
     * @export
     */
    function DocEditJs(discriminator, typeInfos){
        
        var de =  this;
        
        de.discriminator = discriminator;
        de._typeInfos = [];
        de.document = null;
        
        angular.forEach(typeInfos, function(o){
           var t = new DocEditJsTypeInfo(o.type);
           angular.extend(t, o);
           de._typeInfos[t.type] = t;
        });
        
        return this;
    }
    
    DocEditJs.prototype.typeInfo = function(typeName, typeInfo){
        if(typeInfo){
            this._typeInfos[typeName] = typeInfo;
            return this;
        }
        
        var t = this._typeInfos[typeName];
        if(angular.isFunction(t)) {
            return t(typeName);
        } else {
            return t;
        }
    };
    
    DocEditJs.prototype.getTypeInfo = function(discriminator, o, typeName){
        var typeDetails = null;
        
        if(!typeName){
            if(angular.isFunction(discriminator)){
                typeName = discriminator(o);
            } else if(discriminator && o && o[discriminator]) {
                typeName = o[discriminator];
            }
        }
        
        if(typeName)
            typeDetails = this.typeInfo(typeName);
        
        if(!typeDetails){
            if(o && o[discriminator])
                typeName = o[discriminator];
            
            typeDetails = new DocEditJsTypeInfo(typeName, o);
            
            if(typeDetails && typeDetails.type){
                //cache the type info
                this.typeInfo(typeDetails.type, typeDetails);
            }
        }
        
        return typeDetails;
    }
    
    /**
     * DocEditJsTypeInfo
     * 
     * @param type - The type to use
     * @param o - The object the type describes. This can be used to set defaults.
     * @constructor
     */
    function DocEditJsTypeInfo(type, o) {
        
        var info = this;
        
        info.type = type;
        info.canExpand = false;
        info.propertyTypes = [];
        info.ignoredProperties = ['_type'];
        info.tabbedEditors = [];
        info.controller = null;
        info.template = null;
        info.templateUrl = null;
        info.nameForProperty = function(obj, property){
            if(obj && obj.name){
                return obj.name;
            }
            return property;
        };
        info.canAddChildren = false;
        info.restrictChildTypes = [];
        info.icon = null;
        
        if(o != undefined && o != null) {
            var isString = angular.isString(o);
            var isDate = angular.isDate(o);
            var isNumber = angular.isNumber(o);
            
            info.canExpand = !isString && !isDate && angular.isObject(o);
            
            if(isString) {
                info.templateUrl = 'dejs/templates/string.html';
                info.type = info.type || 'string';
            } else if(isDate) {
                info.templateUrl = 'dejs/templates/date.html';
                info.type = info.type || 'date';
            } else if(isNumber) {
                info.templateUrl = 'dejs/templates/number.html';
                info.type = info.type || 'number';
            } else if(angular.isArray(o)){
                info.templateUrl = 'dejs/templates/array.html';
                info.type = info.type || 'array';
                info.canExpand = true;
            } else {
                info.templateUrl = 'dejs/template/object.html';
                info.canExpand = true;
            }
            
            info.canAddChildren = info.canExpand;
        }
        
        return this;
    }
    
    angular.module('doceditjs', [])
    .directive('doceditjsEditor', ['doceditjs', '$compile', function(doceditjs, $compile){
        var de = doceditjs;
        var dejsExpandedItems = {};
        function link(scope, element, attrs) {
            
            scope.dejsExpandedItems = dejsExpandedItems;
            
            function loadDoc() {
                scope.dejsDiscriminator = scope.dejsDiscriminator || de.discriminator;
                scope.dejsTypeInfo = scope.dejsTypeInfo || de.getTypeInfo(scope.dejsDiscriminator, scope.data, scope.dejsTypeName);
                
                if(!scope.dejsContentPath){
                    scope.dejsContentPath = attrs['dejsData'];
                    scope.dataRoot = scope.data;
                } else {
                    scope.dataRoot = scope.$parent.dataRoot;
                }
                
                element.html('<div ng-include="\'dejs/template/node.html\'"></div>');
                
                $compile(element.contents())(scope);
            }
            scope.$watch(attrs['dejsData'], function(v){
                loadDoc();
            });
        }
        
        return {
            scope: {
                dejsTypeInfo: '=',
                dejsDiscriminator: '=',
                dejsTypeName: '=',
                dejsContentPath: '=',
                data: '=dejsData'
            },
            link: link
        };
    }])
    .directive('doceditjsItem', ['doceditjs', '$compile', '$templateRequest', function(doceditjs, $compile, $templateRequest){
        var de = doceditjs;
    
        function link(scope, element, attrs) {
            
            scope.dejsDiscriminator = scope.$eval(attrs.dejsDiscriminator) || scope.dejsDiscriminator || de.discriminator;
            scope.dejsContent = scope.$eval(attrs.dejsContent);
            scope.dejsProperty = scope.$eval(attrs.dejsProperty);
            
            var typeFromParent = null;
            if(scope.$parent && scope.$parent.dejsTypeInfo && scope.dejsProperty) {
                typeFromParent = scope.$parent.dejsTypeInfo.propertyTypes[scope.dejsProperty];
            }
            
            if(angular.isString(scope.dejsProperty))
                scope.dejsContentPath = scope.$parent.dejsContentPath + "['" + scope.dejsProperty + "']";
            else
                scope.dejsContentPath = scope.$parent.dejsContentPath + "[" + scope.dejsProperty + "]";
            
            scope.dejsParentContent = scope.$eval(scope.$parent.dejsContentPath);
            scope.dejsParentPath = scope.$parent.dejsContentPath;
            
            if(scope.dejsContent != undefined && scope.dejsContent != null){
                
                scope.dejsTypeInfo = de.getTypeInfo(scope.dejsDiscriminator, scope.dejsContent, typeFromParent);
                
                var setTemplate = function(template, element){
                    var templateE = angular.element(template);
                    element.append(templateE);
                    $compile(element.contents())(scope);
                }
                
                if(scope.dejsTypeInfo.template){
                    setTemplate(scope.dejsTypeInfo.template, element);
                }
                
                $templateRequest(scope.dejsTypeInfo.templateUrl, true).then(function(response) {
                    setTemplate(response, element);
                }, function() {
                  scope.$emit('$includeContentError', scope.dejsTypeInfo.templateUrl);
                });
            }
        }
        
        return {
            link: link
        };
    }])
    .provider('doceditjs', function DocEditJsProvider() {
      
      var discriminatorProperty = "_type";
      var typeInfos = [];
      
      var discriminator = function(o, typeName){
        
        if(typeName)
            return typeName;
            
        if(o != undefined && o != null) {
            if(o[discriminatorProperty] != null && o[discriminatorProperty] != undefined){
                return o[discriminatorProperty];
            }
            
            if(angular.isString(o))
                return 'string';
            
            if(angular.isDate(o))
                return 'date';
                
            if(angular.isArray(o))
                return 'array';
            
            if(angular.isNumber(o))
                return 'number';
                
            if(angular.isObject(o))
                return 'object';
        }
        
      };
      
      this.discriminator = function(value) {
          if(!value)
            return discriminator;
            
          discriminator = value;
          return this;
      };
      
      this.typeInfos = function(value){
          if(!value)
            return typeInfos;
         
         typeInfos = value;
         return this;
      }
      
      this.$get = [function DocEditJsFactory() {
        return new DocEditJs(discriminator, typeInfos);
      }];
    })
    .filter('dejsName', function DocEditJsNameFilter() {
      return function(input, typeinfo, obj){
          return typeinfo.nameForProperty(obj, input);
      }
    })
    .run(['$templateCache', function($templateCache){
        
        $templateCache.put('dejs/templates/string.html', '<input type="text" class="form-control" ng-model="data[k]" />');
        $templateCache.put('dejs/templates/date.html', '<input type="date" class="form-control" ng-model="data[k]" />');
        $templateCache.put('dejs/templates/number.html', '<input type="number" class="form-control" ng-model="data[k]" />');
        $templateCache.put('dejs/templates/array.html', '<doceditjs-editor ng-if="dejsExpandedItems[dejsContentPath]" ng-model-options="{ updateOn: \'blur\' }" dejs-data="data[k]" dejs-content-path="dejsContentPath" dejs-type-info="dejsTypeInfo"></doceditjs-editor>');
        $templateCache.put('dejs/template/object.html', '<doceditjs-editor ng-if="dejsExpandedItems[dejsContentPath]" dejs-data="data[k]" dejs-content-path="dejsContentPath" dejs-type-info="dejsTypeInfo"></doceditjs-editor>');
        /*
        $templateCache.put('dejs/template/node.html', 
            '<ul class="doceditjs-nodes"> \
                <li ng-repeat="(k, v) in data track by $index"> \
                    <span>{{k | dejsName:dejsTypeInfo:v}}</span><doceditjs-item dejs-content=\'v\' dejs-property="k"></doceditjs-item> \
                </li> \
            </ul>');
        */
        $templateCache.put('dejs/template/node.html', 
            '<table class="table table-bordered doceditjs-nodes"> \
                <tr ng-repeat="(k, v) in data track by $index">\
                    <td class="doceditjs-td-label">\
                    <span ng-if="dejsTypeInfo.canExpand && dejsExpandedItems[dejsContentPath]" ng-click="dejsExpandedItems[dejsContentPath] = !dejsExpandedItems[dejsContentPath]">-</span><span ng-if="dejsTypeInfo.canExpand && !dejsExpandedItems[dejsContentPath]" ng-click="dejsExpandedItems[dejsContentPath] = !dejsExpandedItems[dejsContentPath]">+</span>{{k | dejsName:dejsTypeInfo:v}}</td>\
                    <td class="doceditjs-td-content">\
                        <doceditjs-item dejs-content=\'v\' dejs-property="k"></doceditjs-item> \
                    </td> \
                <tr>\
            </ul>');
    }]);
    
} )();